# Observation Report — Epoch 20

## Phase 1: Full Test Suite

Ran 6 test files (142 tests). 2 failed, 140 passed.

### Failure 1: playbook-hooks.test.ts — hook timeout

```
FAIL  tests/playbook-hooks.test.ts > hook system E2E > should handle hooks that throw without blocking downstream
Error: Test timed out in 10000ms.
 ❯ tests/playbook-hooks.test.ts:225:3
    225|   it("should handle hooks that throw without blocking downstream", async () => {
    226|     reset();
```

**Status: REJECTED (repeat)** — Same failure class as epoch 017 (hook-timeout-017). Same dimension (Correctness), same file (tests/playbook-hooks.test.ts).

### Failure 2: playbook-dag.test.ts — select+ DAG

```
FAIL  tests/playbook-dag.test.ts > select parent+ with dynamic spawn DAG > --select parent+ includes dynamically spawned children in DAG selection
AssertionError: expected false to be true // Object.is equality
 ❯ tests/playbook-dag.test.ts:257:78
    257|     expect(existsSync(join(JOURNAL_DIR, "tasks", "child-alpha", "TASK.md"))).toBe(true);
```

**Status: REJECTED (repeat)** — Shares file tests/playbook-dag.test.ts with epoch 019 (compile-non-deterministic-timestamp).

## Phase 2: Error-path Probes

### Select operator
```
$ node packages/cli/dist/index.js list --playbook self-improvement-loop --select "epoch-013+"
No tasks match selection
```
No error — empty result is valid behavior.

### Dry run
```
$ node packages/cli/dist/index.js run --playbook self-improvement-loop --dry
DAG: 15 nodes (6 cached)
  Cached (skip): epoch-019, epoch-019-000-observe, epoch-019-001-select, epoch-019-002-implement, epoch-019-003-verify, epoch-019-004-summarize
  Will run: improve, root-converge, epoch-020, epoch-020-000-observe, epoch-020-001-select, epoch-020-002-implement, epoch-020-003-verify, epoch-020-004-summarize
  Skipped: root-diverge
  Dry run — 8 task(s) would execute.
```
DAG resolves correctly. `run.mode` deprecation warnings are cosmetic.

### Compile determinism
```
$ node packages/cli/dist/index.js compile --playbook self-improvement-loop
No playbook.yml found at D:\converge
```
Compile command fails for this playbook. Two consecutive compile attempts produced identical empty output, but the command itself errors.

## Phase 3: Static Analysis

Skipped — Phases 1-2 produced error findings (test failures), even though they are repeats.

## Result

All actionable findings are repeats of prior epochs (017, 019). Escalating.
