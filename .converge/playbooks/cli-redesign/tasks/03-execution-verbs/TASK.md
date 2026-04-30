---
id: 03-execution-verbs
title: Execution verbs — run, build, test, retry, clean over the static DAG
description: |
  Five verbs land: `converge run`, `build`, `test`, `retry`, `clean`. Each
  accepts `--select` / `--exclude` and operates against the static
  (concrete) portion of the DAG. WBS phase: one instance per verb runs
  its own red-green-refactor pipeline internally. No staleness logic
  yet — every selected task is treated as fresh.

dependencies:
  - 02-compile-and-list

wbs:
  type: nodejs
  path: ./wbs/index.js

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/cli/src/commands-compile.ts"
  - "packages/cli/src/commands-list.ts"
  - "packages/cli/tests/fixtures/minimal-playbook/.converge/playbooks/default/playbook.yml"
  - "packages/core/src/select/index.ts"
  - "packages/core/src/manifest/index.ts"

outputs:
  - "packages/cli/src/commands-run.ts"
  - "packages/cli/src/commands-build.ts"
  - "packages/cli/src/commands-test.ts"
  - "packages/cli/src/commands-retry.ts"
  - "packages/cli/src/commands-clean.ts"
  - "packages/cli/tests/integration/run-select.test.ts"
  - "packages/cli/tests/integration/build.test.ts"
  - "packages/cli/tests/integration/test-verb.test.ts"
  - "packages/cli/tests/integration/retry.test.ts"
  - "packages/cli/tests/integration/clean.test.ts"

checks:
  - id: typecheck
    cmd: pnpm -r typecheck
    description: Typecheck passes.
  - id: cli-builds
    cmd: pnpm --filter @converge/cli build && test -x packages/cli/dist/index.js
    description: CLI builds end-to-end.
  - id: run-respects-select
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook && rm -rf .converge/journal/default/tasks
      ../../../dist/index.js run --select 'tag:trivial' --max-duration=10000
      test -d .converge/journal/default/tasks/trivial-task
      test ! -d .converge/journal/default/tasks/other-task
    description: "run --select tag:X runs X but not other tasks."
  - id: build-fails-fast
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook && rm -rf .converge/journal/default/tasks
      ../../../dist/index.js build --select 'tag:will-fail' --max-duration=10000; test $? -ne 0
    description: "build fails fast (non-zero exit) on the first uncorrectable failure."
  - id: test-runs-checks-only
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      ../../../dist/index.js test --select 'status:complete' 2>&1 | grep -qE 'pass|fail'
    description: "test runs only checks, not full task execution."
  - id: retry-uses-run-results
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      rm -f .converge/journal/default/target/run_results.json
      out=$(../../../dist/index.js retry 2>&1); rc=$?
      test $rc -ne 0
      echo "$out" | grep -q 'no prior run'
    description: "retry exits non-zero with 'no prior run' message when target/run_results.json is absent."
  - id: clean-respects-select
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      ../../../dist/index.js run --select 'tag:trivial' --max-duration=10000
      ../../../dist/index.js clean --select 'tag:trivial'
      test ! -d .converge/journal/default/tasks/trivial-task
    description: "clean --select <expr> removes journal state for matching tasks."
  - id: integration-tests-green
    cmd: cd packages/cli && pnpm test -- tests/integration/run-select.test.ts tests/integration/build.test.ts tests/integration/test-verb.test.ts tests/integration/retry.test.ts tests/integration/clean.test.ts
    description: All five verb integration tests pass.
  - id: substring-filter-still-works
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook && rm -rf .converge/journal/default/tasks
      ../../../dist/index.js run --select 'trivial' --max-duration=10000
      test -d .converge/journal/default/tasks/trivial-task
    description: Bare value defaults to name:substring (migration-friendly default per spec §4.2).

tags:
  - phase
  - cli
  - execution

vars:
  verbs:
    - run
    - build
    - test
    - retry
    - clean
---

# Execution verbs

## Scope

Land the five verbs that drive or mutate task execution state. When
done, `converge run` no longer takes a positional substring — it takes
`--select`. The verbs differ in shape:

- **`run`** — execute selected tasks via the existing convergence loop.
  Accepts `--step`, `--force`, `--dry`, `--preflight`, `--wbs`, `--inc`
  (composing with `--select` per §8 of the spec).
- **`build`** — `run` + check + repair, with `--fail-fast` on by default.
- **`test`** — run only the `checks:` block of selected tasks, no
  execution, no repair. Useful after manual edits.
- **`retry`** — read `target/run_results.json`, re-run anything with
  `status: error` (effectively `--select 'result:error+'`).
- **`clean`** — delete journal state for selected tasks. Replaces
  today's `--restart` (full-tree wipe) and `reset` (subtree wipe) with
  one selection-driven verb. Includes `--orphaned` (folds today's
  `cleanup`).

This is a WBS phase: each verb is one spawn of a per-verb red-green-refactor
template (see `wbs/index.js`). The per-layer planner writes the template
when this phase is invoked; for now this TASK.md commits to the *contract*
of five verbs.

## Static-DAG only

Anything that requires diffing manifests (`state:modified`, `--state`,
`--defer`, `--full-refresh`, drift detection) is phase 04 or 05. In this
phase, the verbs treat every selected task as fresh — they consult the
journal for completion state (today's behavior) but don't re-validate or
hash-compare anything.

## TDD discipline

Per-verb WBS, each instance runs:
1. Write integration test for the verb (subprocess against the fixture).
2. RED.
3. Implement the verb in `packages/cli/src/commands-<verb>.ts`. Wire into
   the dispatcher.
4. Refactor while GREEN.

The WBS template will encode this 3-step shape. Test files use the
fixture from phase 02.

## Removed v1 behavior (the hard part)

Per §7.6 of the spec, today's automatic re-validation on `--resume` goes
away. This phase removes the `recheckEditedCompletedTasks` call from
`autonomous-run.ts` and related auto-revert logic. **Do not move it** —
deleting it is the change. The replacement (`debug --revalidate`,
`state:modified.checks`) lands in phase 04. Between this phase and phase
04, mtime-edited completions are simply trusted; re-running the playbook
won't auto-redo them. This is acceptable — it's the inverse of dbt's
"never auto-invalidate" stance, which is the target.

## Out of scope

- `state:modified` and `--state`. Phase 04.
- `materialization: incremental`, `--full-refresh`, source freshness.
  Phase 05.
- Migration-shim error messages for removed v1 commands. Phase 06.

## References

- Spec: `docs/design/cli-redesign.md` §3 (verb table), §8 (run-mode flags
  vs selection), §9 (migration, for what each verb replaces).
- Today's runner: `packages/cli/src/autonomous-run.ts`. The verb
  implementations call into `runAutonomous` (or its successor) but with
  selection-driven task pools instead of the substring filter.
- WBS template anchor: see `examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/tasks/03-build-screens/wbs/templates/screen-with-reference/`
  for a per-instance template shape.

## Open questions for the per-layer planner

- WBS template body. Each verb spawn needs a 3-step template:
  `01-write-failing-integration-test`, `02-implement`, `03-refactor`. The
  planner decides whether refactor is its own leaf or folded into 02.
- Whether `retry` is genuinely simpler than the others (it's effectively
  syntactic sugar for `run --select 'result:error+' --state target/`)
  and could be a hand-written one-pager rather than a WBS instance.
- Removing the auto-revalidation: own leaf or part of `run`'s
  implementation? Default: own leaf, executed first so subsequent verb
  leaves don't have to think about it.
