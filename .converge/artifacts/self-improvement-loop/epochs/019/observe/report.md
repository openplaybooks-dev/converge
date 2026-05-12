# Epoch 19 Observation Report

## Phase 1 — Full Test Suite

Command:
```
pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts tests/playbook-seeds.test.ts tests/playbook-loop-seed.test.ts tests/playbook-run-lock.test.ts tests/playbook-hooks.test.ts
```

Result: **1 test failed** (141 passed, 1 failed across 6 files)

### Failing test

**File:** `tests/playbook-hooks.test.ts:225`
**Test:** "should handle hooks that throw without blocking downstream"
**Error:** `Test timed out in 10000ms.`

The test creates two tasks (task-a tagged "risky", task-b depending on task-a) with a hook that throws on `task:complete` for "risky" tags. The test expects `result.failed > 0` and `a.txt` to exist (hook failure isolates, task-b is blocked). Instead the run hangs and times out — the hook error is not handled gracefully, causing the run to stall.

## Phase 2 — Error-Path Probes

### 2a. Hook error handling (confirm)
```
HOOKS_FAIL: 1 test failed (same timeout as above)
```

### 2b. Dry run
DAG: 9 nodes. 8 tasks would execute (root-diverge skipped).

### 2c. Select operator
```
converge list --playbook self-improvement-loop --select "epoch-013+"
→ "No tasks match selection"
```
The `+` operator (range-from) returned empty — tasks use numeric epoch prefixes but the operator may not parse them correctly.

### 2d. Compile determinism
Two sequential compiles produce different `manifest.json` files:
```
- "generated_at": "2026-05-12T10:58:41.904Z"
+ "generated_at": "2026-05-12T10:58:40.394Z"
```
The `generated_at` timestamp changes each compile, making manifests non-identical for the same input.

### 2e. Loop-seed concurrency
All loop-seed tests pass (1 test, 2713ms).

## Phase 3 — Static Analysis (skipped per rubric: Phase 1 produced errors)

### Noted (for reference)
- 10 `process.exit(1)` calls in playbook scripts (check-epoch-complete.mjs, check-clean-start.mjs, check-final-diff.mjs, check-patch-manifest.mjs)
