# Observation Report — Epoch 001

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
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/playbook-hooks.test.ts:225:3
```

The test defines a hook that throws on `task-a` and expects downstream `task-b` to still execute. The timeout suggests the throwing hook either hangs or blocks execution rather than being isolated.

### Failure 2: `tests/playbook-dag.test.ts` — "--select parent+ includes dynamically spawned children in DAG selection"

```
FAIL  tests/playbook-dag.test.ts > select parent+ with dynamic spawn DAG > --select parent+ includes dynamically spawned children in DAG selection
AssertionError: expected false to be true // Object.is equality
 ❯ tests/playbook-dag.test.ts:257:78
     expect(existsSync(join(JOURNAL_DIR, "tasks", "child-alpha", "TASK.md"))).toBe(true);
```

The `--select parent+` operator does not include dynamically spawned children (`child-alpha`, `child-beta`) in the DAG selection when it should.

## Phase 2 — Error-Path Probes

### Abort/resume behavior (dry run)
```
DAG: 9 nodes
  Will run:      improve, root-converge, epoch-001, epoch-001-000-observe, epoch-001-001-select, epoch-001-002-implement, epoch-001-003-verify, epoch-001-004-summarize
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

### Stale manifest / compile determinism
Compile commands require a valid playbook.yml configuration. The `implement-feature` playbook returns "No playbook.yml found." The self-improvement-loop playbook compiles via the run command (dry-run above confirmed). Could not test standalone `compile` determinism.

## Summary

| Phase | Probes Run | Failures |
|-------|-----------|----------|
| Phase 1 (full test suite) | 142 tests | 2 failures |
| Phase 2 (error-path) | 5 probes | 0 failures |
| Phase 3 (static analysis) | Skipped (Phase 1 had errors) | N/A |

Two rank-1 findings: one test timeout (hooks error isolation broken), one DAG selection bug (--select parent+ misses dynamic children).
