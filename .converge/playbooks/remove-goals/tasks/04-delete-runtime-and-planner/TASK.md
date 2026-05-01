---
id: 04-delete-runtime-and-planner
title: Delete goal-manager.ts and goal-planner.ts; final runtime cleanup
description: |
  The schema is gone (phase 03). Nothing emits or consumes goal data
  anymore. Now delete the two large runtime/planner files that implement
  the goal lifecycle, and prune any final residue in runtime.ts,
  converge-runner.ts, and dod-runner.ts that phase 02's per-file pass
  could not catch (e.g. references gated behind feature flags or accessed
  via dynamic dispatch).

dependencies:
  - 03-delete-schema-and-parser

inputs:
  - "packages/core/src/runtime/goal-manager.ts"
  - "packages/core/src/converge/goal-planner.ts"
  - "packages/core/src/runtime/runtime.ts"
  - "packages/core/src/converge/converge-runner.ts"
  - "packages/core/src/converge/dod-runner.ts"
  - "packages/core/src/runtime/index.ts"
  - "packages/core/src/converge/index.ts"

outputs:
  - "packages/core/src/runtime/runtime.ts"
  - "packages/core/src/converge/converge-runner.ts"
  - "packages/core/src/converge/dod-runner.ts"
  - "packages/core/src/runtime/index.ts"
  - "packages/core/src/converge/index.ts"

checks:
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: Typecheck green.
  - id: tests-green
    cmd: pnpm -r test
    description: Tests pass.
  - id: goal-manager-deleted
    cmd: "! test -e packages/core/src/runtime/goal-manager.ts"
    description: goal-manager.ts is gone.
  - id: goal-planner-deleted
    cmd: "! test -e packages/core/src/converge/goal-planner.ts"
    description: goal-planner.ts is gone.
  - id: no-goal-token-in-runtime-or-converge
    cmd: |
      hits=$(grep -rEn '\bgoal[A-Za-z]*\b' \
        packages/core/src/runtime/ \
        packages/core/src/converge/ \
        2>/dev/null || true)
      test -z "$hits" || { echo "$hits"; exit 1; }
    description: No word-boundary `goal` references remain anywhere under packages/core/src/{runtime,converge}/.

tags:
  - phase
  - runtime
  - delete
---

# Phase 04 — Delete Runtime and Planner

## Scope

Two file deletions + one residue sweep:

### 1. Delete `packages/core/src/runtime/goal-manager.ts` (154 lines)

Implements `GoalManager` — the runtime hook that emits `GOAL.md` files when a task with `goalDefs:` completes. Phase 03 stripped `goalDefs` from the schema, so the only thing keeping this file alive is its own export. Delete it. Remove the export from `packages/core/src/runtime/index.ts`.

### 2. Delete `packages/core/src/converge/goal-planner.ts` (1,365 lines)

The big one. Implements `evaluateGoals()` and `planFromGoals()` — the AI-driven remediation planner that the now-deleted `converge goals --plan` command used. Phase 02 stripped every caller. Delete the file. Remove the export from `packages/core/src/converge/index.ts`.

### 3. Residue sweep in `runtime.ts`, `converge-runner.ts`, `dod-runner.ts`

Phase 02's per-file pass operated on each file in isolation. After the deletions in (1) and (2), final residue may surface:
- Dead helper functions that only goal code called.
- Comments referencing the goal lifecycle.
- Type aliases that pointed at `GoalDef` (now deleted) and were re-exported as `unknown`.
- Feature-flag branches gated on a goal-related env var.

Run `grep -rEn '\bgoal[A-Za-z]*\b' packages/core/src/runtime/ packages/core/src/converge/` after the deletions and clean up everything it surfaces.

## TDD discipline

- **`01-red/`**: `tests/no-goals/runtime.test.ts` with three assertions:
  1. `expect(fs.existsSync('packages/core/src/runtime/goal-manager.ts')).toBe(false)`
  2. `expect(fs.existsSync('packages/core/src/converge/goal-planner.ts')).toBe(false)`
  3. A grep-based assertion: `expect(grepWordBoundary('goal', 'packages/core/src/runtime/'))` returns 0 hits.

  All three fail today.

- **`02-green/`**: delete the two files, sweep residue, until all three assertions pass.

## References

- `/Users/minh/Documents/converge/packages/core/src/runtime/goal-manager.ts` — file 1 to delete.
- `/Users/minh/Documents/converge/packages/core/src/converge/goal-planner.ts` — file 2 to delete.
- REFS.md — should mark both as `delete`.

## Out of scope

- The CLI entry point. Phase 05.
- The `commands-goals.ts` file. Phase 05.
- Docs. Phase 06.

## Open questions for the per-layer planner

- `goal-planner.ts` is 1,365 lines. Worth splitting the deletion into "delete the file" and "fix the broken consumers" leaves? Default: no — phase 02 already stripped consumers, so deletion should be one atomic edit. If `pnpm -r typecheck` reds afterwards, that's a phase-02 escape and should be patched in this phase's `02-green`.
