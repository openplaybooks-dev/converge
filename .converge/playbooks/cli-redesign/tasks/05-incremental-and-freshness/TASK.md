---
id: 05-incremental-and-freshness
title: Incremental tasks, full-refresh, and source freshness
description: |
  Tasks marked `materialization: incremental` honor `is_incremental` /
  `this_state` template variables and skip prior work on re-run.
  `--full-refresh` forces fresh execution. `converge source freshness`
  reads `freshness:` declarations and reports `pass | warn | error` per
  source. This phase mirrors dbt's `is_incremental()` and
  `dbt source freshness`.

dependencies:
  - 04-staleness

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/core/src/manifest/run-results.ts"
  - "packages/core/src/select/index.ts"

outputs:
  - "packages/core/src/task/incremental.ts"
  - "packages/core/tests/unit/task/incremental.test.ts"
  - "packages/core/src/freshness/index.ts"
  - "packages/core/src/freshness/types.ts"
  - "packages/core/tests/unit/freshness/freshness.test.ts"
  - "packages/cli/src/commands-source.ts"
  - "packages/cli/tests/integration/incremental.test.ts"
  - "packages/cli/tests/integration/full-refresh.test.ts"
  - "packages/cli/tests/integration/source-freshness.test.ts"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge typecheck
    description: Typecheck passes.
  - id: incremental-skips-prior-work
    cmd: cd packages/cli && pnpm test -- tests/integration/incremental.test.ts -t 'second run is a no-op for unchanged inputs'
    description: An incremental task run twice with unchanged inputs is a no-op the second time.
  - id: incremental-template-vars
    cmd: cd packages/cli && pnpm test -- tests/integration/incremental.test.ts -t 'template vars'
    description: is_incremental and this_state are injected into the agent prompt template.
  - id: full-refresh-overrides
    cmd: cd packages/cli && pnpm test -- tests/integration/full-refresh.test.ts
    description: --full-refresh forces re-execution of an incremental task.
  - id: source-freshness-reports
    cmd: cd packages/cli && pnpm test -- tests/integration/source-freshness.test.ts
    description: "source freshness reports pass/warn/error per source."
  - id: source-freshness-exit-codes
    cmd: |
      test -d packages/cli/tests/fixtures/minimal-playbook && \
      cd packages/cli/tests/fixtures/minimal-playbook && \
      ../../../dist/index.js source freshness --select 'name:fresh-source' && \
      ! ../../../dist/index.js source freshness --select 'name:stale-source'
    description: source freshness exits 0 on all-pass and non-zero when any source is in error state.

tags:
  - phase
  - cli
  - incremental
  - freshness

vars:
  default_warn_after: { count: 12, period: hour }
  default_error_after: { count: 24, period: hour }
children:
  - 01-incremental
  - 02-full-refresh
  - 03-source-freshness
---

# Incremental tasks and source freshness

## Scope

Two related but separate features. Both ship in this phase because both
build on the run_results hash machinery from phase 04 (incremental reuses
it for "what was already produced," freshness uses the same write path
to record the load-time of a source artifact).

### Incremental tasks (§7.8)

Add to TASK.md frontmatter:

```yaml
materialization: incremental
unique_key: token_id        # OR
watermark: rendered_at
```

When set, the runner:
1. On first execution: behaves normally; `is_incremental` template var
   is `false`.
2. On subsequent execution: `is_incremental` is `true`,
   `this_state` is the path to the prior run's outputs (under `target/`
   or a configured location).
3. The agent (or skill, or WBS script) is responsible for the actual
   append-only logic — read the prior output, compute the watermark,
   produce only the new portion. Same contract as dbt: framework
   provides the bit and the pointer, user writes the watermark.

`--full-refresh` (§8 of the spec) forces `is_incremental` to `false`
even if the task is materialized as incremental. Replaces today's
overloaded `--restart`.

### Source freshness (§7.7)

For tasks with `freshness:` in frontmatter:

```yaml
freshness:
  loaded_at: "inputs/raw-shots.json"
  warn_after:  { count: 12, period: hour }
  error_after: { count: 24, period: hour }
```

`converge source freshness [--select <expr>]` reads the field, mtimes
the `loaded_at` file, compares against thresholds, prints
`pass | warn | error` per source, and exits non-zero on any `error`.
Does not invalidate downstream — that's the user's call (e.g.
`--select 'source_status:fresher+' --state ...` mirroring dbt's
`source_status` selector, deferred to a follow-up).

## TDD discipline

Per-feature red-green-refactor. The incremental tests need two-run
fixtures (run once, snapshot, run again, assert no-op). The freshness
tests can fake mtimes with `fs.utimes()` for deterministic threshold
crossing.

## Out of scope

- `source_status:` selector method. Documented in the spec (§7.7) but
  deferred to a follow-up.
- Cost reporting on incremental skips (`metrics --skipped`). Doesn't
  exist in spec; deferred.
- Watermark inference. Per §7.10 of the spec, **explicitly not adopted** —
  the user writes the watermark, like dbt.

## References

- Spec: `docs/design/cli-redesign.md` §7.7 (freshness), §7.8 (incremental),
  §7.10 (what we deliberately don't adopt).
- run_results writer: `packages/core/src/manifest/run-results.ts` (from
  phase 04). Incremental adds an `incremental_skip: true` flag to a
  result entry when the task was a no-op.
- Skill prompt template injection point: existing skill-running code
  passes `vars` to template substitution; `is_incremental` and
  `this_state` are added as auto-injected vars (not user-declared).

## Open questions for the per-layer planner

- Where does `this_state` point to? The spec proposes `target/last/` as
  a symlink updated after every successful run. Decide here. If
  symlinks are awkward (Windows), use a `target/last.json` pointer file.
- Does `--full-refresh` apply to all selected tasks or only those with
  `materialization: incremental`? Default: all tasks (mirrors dbt).
  Tasks that aren't incremental ignore it (no-op).
- Whether to add a `materialization: ephemeral` (don't write outputs to
  disk, only in-memory pass to downstream) — dbt has it but Converge has
  no analogue. Default: don't add. Out of scope, mention in follow-ups.
