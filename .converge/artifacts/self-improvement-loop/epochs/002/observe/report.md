# Observation Report — Epoch 002

## Anti-Repeat Check

Epoch 001 selected `hooks-throw-timeout` (Correctness) and `select-parent-plus-missing-children` (Determinism). Both still fail in epoch 002 — these are repeats per the anti-repeat rule.

## Phase 1 — Full Test Suite

Command:
```
pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts tests/playbook-seeds.test.ts tests/playbook-loop-seed.test.ts tests/playbook-run-lock.test.ts tests/playbook-hooks.test.ts
```

Results: **2 failed, 140 passed (6 test files)**

### Failure 1: `tests/playbook-hooks.test.ts` — "should handle hooks that throw without blocking downstream"

```
FAIL  tests/playbook-hooks.test.ts > hook system E2E > should handle hooks that throw without blocking downstream
Error: Test timed out in 10000ms.
 ❯ tests/playbook-hooks.test.ts:225:3
```

Repeat from epoch 001. The test defines a hook that throws on `task-a` and expects downstream `task-b` to still execute. The timeout suggests the throwing hook either hangs or blocks execution rather than being isolated.

### Failure 2: `tests/playbook-dag.test.ts` — "--select parent+ includes dynamically spawned children in DAG selection"

```
FAIL  tests/playbook-dag.test.ts > select parent+ with dynamic spawn DAG > --select parent+ includes dynamically spawned children in DAG selection
AssertionError: expected false to be true // Object.is equality
 ❯ tests/playbook-dag.test.ts:257:78
```

Repeat from epoch 001. `--select parent+` does not include dynamically spawned children (`child-alpha`, `child-beta`) in the DAG selection.

## Phase 2 — Error-Path Probes

### Hook error handling
```
HOOKS_FAIL: Test timed out in 10000ms.
```
Result: FAIL (repeat of Phase 1 finding)

### Abort/resume behavior (dry run)
```
DAG: 15 nodes (6 cached)
  Will run:      improve, root-converge, epoch-002, epoch-002-000-observe, epoch-002-001-select, epoch-002-002-implement, epoch-002-003-verify, epoch-002-004-summarize
  Skipped:       root-diverge
  Dry run — 8 task(s) would execute.
```
Result: PASS — DAG compiles and dry-run resolves correctly.

### Select operator edge cases
```
node packages/cli/dist/index.js list --playbook self-improvement-loop --select "epoch-013+"
No tasks match selection
```
Result: PASS — out-of-range select returns clean empty result.

### Concurrency / loop seed
```
pnpm vitest run tests/playbook-loop-seed.test.ts --reporter=verbose
 ✓ loop seed driver > re-runs an incremental seed parent until maxIterations in one invocation
```
Result: PASS.

### Compile determinism
```
DAG count 1: 15
DAG count 2: 15
MATCH: YES
```
Result: PASS — two consecutive dry runs produce identical DAG node counts.

## Phase 3 — Static Analysis

Skipped: Phase 1 had errors (Phase 3 only runs when Phases 1-2 are clean).

## Summary

| Phase | Probes Run | Failures |
|-------|-----------|----------|
| Phase 1 (full test suite) | 142 tests | 2 failures |
| Phase 2 (error-path) | 5 probes | 1 failure (repeat) |
| Phase 3 (static analysis) | Skipped | N/A |

Both failing tests are repeats from epoch 001. No new findings discovered. **Escalation**: all actionable findings overlap with prior epoch. The two failures (`hooks-throw-timeout`, `select-parent-plus-missing-children`) persist unaddressed from epoch 001.
