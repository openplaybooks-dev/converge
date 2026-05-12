# Observation Report — Epoch 017

## Phase 1: Full Test Suite

```
pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts tests/playbook-seeds.test.ts tests/playbook-loop-seed.test.ts tests/playbook-run-lock.test.ts tests/playbook-hooks.test.ts
```

**Result: 1 failed, 141 passed (6 files)**

### Failing test

```
FAIL  tests/playbook-hooks.test.ts > hook system E2E > should handle hooks that throw without blocking downstream
Error: Test timed out in 10000ms.

tests/playbook-hooks.test.ts:225:3
    223|   });
    224|
    225|   it("should handle hooks that throw without blocking downstream", asy…
       |   ^
    226|     reset();
```

### Passing tests (5 files, 141 tests)
- playbook-compile.test.ts — all passed
- playbook-dag.test.ts — all passed
- playbook-seeds.test.ts — all passed
- playbook-loop-seed.test.ts — all passed
- playbook-run-lock.test.ts — all passed

## Phase 2: Error-Path Probes

### Hook error handling
```
HOOKS_FAIL — same timeout at playbook-hooks.test.ts:225:3
```

### Abort/resume (--dry)
```
DAG: 9 nodes
  Will run:      improve, root-converge, epoch-017, epoch-017-000-observe,
                 epoch-017-001-select, epoch-017-002-implement,
                 epoch-017-003-verify, epoch-017-004-summarize
  Skipped:       root-diverge
  Dry run — 8 task(s) would execute.
```

Notable: 14 deprecation warnings for `run.mode` per task, plus 3 playbooks emit "no tasks/ directory" warnings (smoke-test, test-progress-curl, test-progress-fresh).

### Select operator
```
$ node packages/cli/dist/index.js list --playbook self-improvement-loop --select "epoch-013+"
No tasks match selection
```

Unexpected — epoch-013 through epoch-017 tasks exist in the journal. The `+` suffix selector appears to not match.

### Concurrency edge
```
loop seed driver > re-runs an incremental seed parent until maxIterations in one invocation — PASSED (2673ms)
```

### Compile determinism
CLI has no `compile` subcommand — probe not applicable.

## Phase 3: Static Analysis

Skipped — Phase 1 produced a rank-1 finding (failing test).
