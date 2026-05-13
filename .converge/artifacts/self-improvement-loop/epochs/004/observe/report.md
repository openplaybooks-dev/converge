# Epoch 004 Observation Report

## Phase 1 — Full Test Suite

**Result: 2 failures (both repeats from epochs 001 and 002)**

```
Test Files  2 failed | 4 passed (6)
     Tests  2 failed | 140 passed (142)
```

### Failure 1: hooks-throw-timeout (REPEAT — epoch 002)

```
FAIL  tests/playbook-hooks.test.ts > hook system E2E > should handle hooks that throw without blocking downstream
Error: Test timed out in 10000ms.
 ❯ tests/playbook-hooks.test.ts:225:3
```

### Failure 2: select-parent-plus-missing-children (REPEAT — epoch 001)

```
FAIL  tests/playbook-dag.test.ts > select parent+ with dynamic spawn DAG > --select parent+ includes dynamically spawned children in DAG selection
AssertionError: expected false to be true // Object.is equality
 ❯ tests/playbook-dag.test.ts:257:78
```

## Phase 2 — Error-path Probes

| Probe | Status | Detail |
|---|---|---|
| Hook error handling | FAIL | Repeat of hooks-throw-timeout |
| Dry run | PASS | 27 nodes, 18 cached, 8 would execute |
| Select operator edge | PASS | "No tasks match selection" (no epoch-013 in playbook) |
| Concurrency edge | PASS | loop-seed 1/1 passed |
| Cache invalidation | INCONCLUSIVE | --dry mode may bypass cache freshness checks |
| Compile determinism | FAIL | `compile` command errors: "No playbook.yml found at /Users/minh/Documents/converge" |

## Phase 3 — Static Analysis

Skipped — Phase 1 found errors.

## Decision: ESCALATE

All actionable findings are repeats of epochs 001 and 002. Prior epoch IDs: `select-parent-plus-missing-children` (epoch 001), `hooks-throw-timeout` (epoch 002). No new non-cosmetic findings discovered.
