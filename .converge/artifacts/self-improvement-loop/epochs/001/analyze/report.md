# Selection Report — Epoch 001

## Selected: `select-parent-plus-missing-children`

**Priority**: 1 — Failing test (DAG determinism)

**Test**: `tests/playbook-dag.test.ts` > "select parent+ with dynamic spawn DAG > --select parent+ includes dynamically spawned children in DAG selection"

The `--select parent+` operator does not include dynamically spawned children (`child-alpha`, `child-beta`) in the DAG. `existsSync(TASK.md)` returns false for both children after parent+ selection completes.

**Rationale**: This is a focused, reviewable DAG traversal bug. The fix is localized to the parent+ expansion logic in the DAG module. The failing test provides a clear regression gate.

## Rejected: `hooks-throw-timeout`

**Test**: `tests/playbook-hooks.test.ts` > "hook system E2E > should handle hooks that throw without blocking downstream"

This test times out after 10000ms. The hook that throws on `task-a` either hangs or blocks downstream `task-b` execution.

**Why rejected for this epoch**: Hook error isolation likely touches multiple subsystems — error boundaries, promise chains, task lifecycle propagation. The scope is too broad for a single small, reviewable patch. The fix needs more investigation to identify the minimal change. This is added to the backlog for a future epoch.

## Anti-repeat check

No prior epochs exist. All selection tiers above DAG determinism (#1 failing tests, #2 state/lifecycle) were checked: the only #1 candidate (`hooks-throw-timeout`) was rejected for scope, not priority.

## Test strategy

Run existing coverage: `pnpm vitest run tests/playbook-dag.test.ts`. The failing test at line 257 already reproduces the bug. After the fix, the full 17-test DAG suite serves as the regression gate.
