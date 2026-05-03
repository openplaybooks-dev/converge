---
id: 04-staleness
title: Staleness — the state:modified.* ladder, run_results, drift detection
description: |
  The seven `state:modified.*` sub-methods resolve against `--state PATH`.
  `target/run_results.json` carries output hashes so `state:modified.drifted`
  can detect hand-edited artifacts. `converge debug --revalidate` re-runs
  checks of completed tasks (the old auto-revalidation, now opt-in).
  This is the dbt-parity phase — staleness becomes a queryable fact.

dependencies:
  - 03-execution-verbs

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/core/src/select/index.ts"
  - "packages/core/src/manifest/index.ts"
  - "packages/core/src/hash/index.ts"
  - "packages/cli/src/commands-list.ts"
  - "packages/cli/src/commands-run.ts"

outputs:
  - "packages/core/src/select/resolver.ts"
  - "packages/core/tests/unit/select/state-resolver.test.ts"
  - "packages/core/src/manifest/run-results.ts"
  - "packages/core/tests/unit/manifest/run-results.test.ts"
  - "packages/cli/src/commands-debug.ts"
  - "packages/cli/tests/integration/state-modified.test.ts"
  - "packages/cli/tests/integration/drift.test.ts"
  - "packages/cli/tests/integration/debug-revalidate.test.ts"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Typecheck passes.
  - id: state-modified-body
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts -t 'body'
    description: state:modified.body diff regression test passes.
  - id: state-modified-checks
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts -t 'checks'
    description: state:modified.checks diff regression test passes.
  - id: state-modified-frontmatter
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts -t 'frontmatter'
    description: state:modified.frontmatter diff regression test passes.
  - id: state-modified-inputs
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts -t 'inputs'
    description: state:modified.inputs diff regression test passes.
  - id: state-modified-upstream
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts -t 'upstream'
    description: state:modified.upstream propagation test passes.
  - id: state-modified-playbook
    cmd: cd packages/cli && pnpm test -- tests/integration/state-modified.test.ts -t 'playbook'
    description: state:modified.playbook detects vars / project-checks edits.
  - id: state-drifted
    cmd: cd packages/cli && pnpm test -- tests/integration/drift.test.ts
    description: state:modified.drifted detects hand-edited outputs vs run_results hashes.
  - id: run-results-emitted
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook && rm -rf .converge/journal/default/target
      ../../../dist/index.js run --select 'tag:trivial' --max-duration=10000
      test -s .converge/journal/default/target/run_results.json
      node -e "const r=JSON.parse(require('fs').readFileSync('.converge/journal/default/target/run_results.json'));
      const e=r.results.find(x=>x.id==='trivial-task');
      if(!e||!e.output_hashes||Object.keys(e.output_hashes).length===0)process.exit(1);"
    description: run_results.json carries non-empty output_hashes per task.
  - id: debug-revalidate-opt-in
    cmd: cd packages/cli && pnpm test -- tests/integration/debug-revalidate.test.ts
    description: debug --revalidate runs checks and reports without invalidating; default `run` does NOT auto-revalidate.

tags:
  - phase
  - cli
  - staleness

vars:
  ladder_methods:
    - body
    - frontmatter
    - checks
    - inputs
    - upstream
    - playbook
    - drifted
children:
  - 01-modified-ladder
  - 02-run-results-hashes
  - 03-drift
  - 04-debug-revalidate
---

# Staleness

## Scope

Seven `state:modified.*` sub-methods + drift detection + opt-in
revalidation. By the end of this phase, the user can say "what changed?"
and the answer is honest, fast, and queryable.

The seven methods (per §7.4 of the spec doc):

| Method | Triggers when |
|---|---|
| `state:modified.body` | TASK.md body hash differs vs `--state` |
| `state:modified.frontmatter` | Frontmatter hash differs (excludes checks alone) |
| `state:modified.checks` | Only the checks block changed |
| `state:modified.inputs` | An inputs file's content changed |
| `state:modified.upstream` | A direct parent's hash changed |
| `state:modified.playbook` | playbook.yml (vars / project checks) changed |
| `state:modified.drifted` | A declared output's content differs from run_results.json |

`state:modified` (no suffix) is the union of the seven.

`run_results.json` (per §6.2 of the spec) gains an `output_hashes` map per
result entry. It's written after every task completion in `run` / `build`
/ `retry`. `test` does not write run_results (it doesn't execute tasks).

`converge debug --revalidate [--select <expr>]` re-runs the `checks:`
block of selected completed tasks and reports pass/fail without
invalidating. This restores the *behavior* of today's automatic
re-validation but gated behind an explicit verb.

## Hash-cost guardrail

Per the open question in §13.3 of the spec, `inputs_hash` over large
binaries is expensive. Default in this phase: hash everything; emit a
warning line per file >50 MB. A user-facing flag (`--max-hash-size=...`)
is out of scope; it lives in a follow-up.

## TDD discipline

Each leaf is a strict red-green-refactor. The `state:modified.*` ladder
naturally decomposes into one leaf per sub-method (one failing
integration test → one minimal resolver → refactor). The drift detector
and `debug --revalidate` are their own leaves.

## Out of scope

- `--defer` — uses prior outputs to skip upstream. Phase 04 lays the
  groundwork (run_results carries hashes); the `--defer` *runtime
  substitution* lands in phase 05 alongside incremental tasks (which use
  the same prior-output mechanism).
- Incremental `materialization`. Phase 05.
- Source freshness. Phase 05.

## References

- Spec: `docs/design/cli-redesign.md` §7 (entire), especially §7.4 (the
  ladder), §7.5 (the recipe), §7.6 (revalidation).
- Existing mtime-only edit detection: `recheckEditedCompletedTasks` in
  `packages/cli/src/autonomous-run.ts`. Phase 03 already removed it; this
  phase replaces it with hash-based equivalents.
- Hash module: `packages/core/src/hash/` (from phase 01) is the building
  block.

## Open questions for the per-layer planner

- Test fixture extension. Each `state:modified.*` test needs two
  manifests on disk (the prior `--state` and the current). Easiest: the
  test creates two playbook copies with controlled deltas, runs `compile`
  on each, points `--state` at the first. Helper function in
  `packages/cli/tests/integration/_helpers.ts` reduces duplication.
- Whether to land `--defer`'s parsing here (since the parser is frozen)
  or wait for phase 05. Default: parse here, no-op until 05.
