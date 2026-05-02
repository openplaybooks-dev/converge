---
id: auto-complete
title: Auto-complete — confirm navigator-graph already skips satisfied tasks (outputs + checks)
description: |
  The navigator-graph's `converge()` already has auto-completion built in.
  Before executing a task, the `check-outputs-exist` preflight action runs
  `findGaps()` which verifies:

    1. All declared outputs exist on disk (with glob expansion and file
       validation — magic bytes for PNG/JPEG, non-empty for others).
    2. All declared checks pass (both `cmd` and `ai` check types).
    3. No corrupted outputs.

  If zero actionable gaps are found (`gapKind === "output" | "corrupted" |
  "check"`), it returns `{ action: "done", success: true }` — terminating
  the convergence loop immediately without executing the task.

  This task confirms that `executeDag()` delegates per-node execution to
  `converge()` (the existing navigator-graph loop), which already handles
  this. No new auto-completion logic needed — just verify the integration
  point is correct.

inputs:
  - packages/core/src/navigator/core/actions/preflight/check-outputs-exist.ts
  - packages/core/src/task/unit/find-gaps.ts
  - packages/core/src/navigator/core/navigator.ts
  - packages/core/src/dag/dag-runner.ts

outputs:
  - packages/core/tests/dag/auto-complete.test.ts

checks:
  - id: auto-complete-tests-pass
    cmd: pnpm --filter @converge core test -- auto-complete
    description: Auto-complete tests confirm navigator-graph handles this.
  - id: outputs-and-checks-both-checked
    cmd: grep -q 'gapKind.*output.*corrupted.*check\|output.*check.*corrupted' packages/core/src/navigator/core/actions/preflight/check-outputs-exist.ts
    description: check-outputs-exist filters for output, corrupted, AND check gaps.
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/navigator/core/actions/preflight/check-outputs-exist.ts"
  - "packages/core/src/task/unit/find-gaps.ts"

vars: {}
dependencies: []
children:
  - auto-complete-red
  - auto-complete-green
---

# auto-complete — navigator-graph already handles this

The existing navigator-graph `converge()` loop already skips tasks
whose outputs exist and checks pass. The `executeDag()` runner
delegates per-node execution to `converge()`, so this comes for free.

## How it works today

In `packages/core/src/navigator/core/default-graph.ts`, the preflight
phase seeds `check-outputs-exist` (priority 99) as a Phase 1 node.

`check-outputs-exist.ts`:
1. Calls `findGaps(unit)` from `packages/core/src/task/unit/find-gaps.ts`.
2. `findGaps()` checks: input existence, output existence (with glob
   expansion and file-type validation), output corruption, AND runs
   every check via `runCheck()` (both `cmd` and `ai` types).
3. Filters gaps to `gapKind === "output" | "corrupted" | "check"`.
4. If zero actionable gaps → returns `{ action: "done", success: true,
   reason: "Outputs already present" }`.
5. This terminates the convergence loop — task is skipped.

The `signal-done` action later confirms with the `noGaps` goal
condition: `gaps.length === 0`.

## What this task does

Confirm the integration point: `executeDag()` calls `converge()` (the
existing navigator-graph loop) for each node. The navigator-graph's
built-in preflight check handles auto-completion. No new code needed
in `executeDag()` — just verify with tests that:

1. A node whose outputs all exist AND checks all pass → `converge()`
   returns `{ success: true }` without executing the task body.
2. A node with a missing output → `converge()` runs the task.
3. A node with a failing check → `converge()` runs the task.
4. Both conditions must hold (outputs alone insufficient, checks alone
   insufficient).

## Children

### red
Write tests confirming the navigator-graph's auto-completion behavior.
Test with real `converge()` calls against fixture tasks.

### green
Run tests — they should already pass (the logic exists). If any test
fails, fix the integration between `executeDag()` and `converge()`.

## Done when

Tests confirm navigator-graph checks both outputs AND checks before
skipping. Integration between DAG runner and converge() is verified.
