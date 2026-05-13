# Verify — Epoch 1

**Result:** FAILED

## Selected improvement
- ID: select-parent-plus-missing-children
- Goal: Fix --select parent+ to include dynamically spawned children in DAG selection
- Files changed: 15
- Test command: pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts

## Commands run
| Command | Exit code | Result | Notes |
|---|---:|---|---|
| pnpm --filter @converge/cli build | 0 | PASS | Build succeeded |
| pnpm --filter @converge/core build | 0 | PASS | Build succeeded |
| pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts | 1 | FAIL | 1 test failed: select parent+ with dynamic spawn DAG |
| pnpm vitest run tests/playbook-loop-seed.test.ts | 0 | PASS | Regression suite for core run/seed/loop changes — 1 test passed |
| pnpm vitest run tests/playbook-seeds.test.ts | 0 | PASS | Regression suite for core seed changes — 13 tests passed |

## Evidence
```
FAIL  tests/playbook-dag.test.ts > select parent+ with dynamic spawn DAG > --select parent+ includes dynamically spawned children in DAG selection
AssertionError: expected false to be true // Object.is equality
 ❯ tests/playbook-dag.test.ts:257:78
     expect(existsSync(join(JOURNAL_DIR, "tasks", "child-alpha", "TASK.md"))).toBe(true)
     expect(existsSync(join(JOURNAL_DIR, "tasks", "child-beta", "TASK.md"))).toBe(true)
```

compile test suite: 104 tests passed
dag test suite: 16/17 passed, 1 failed
loop-seed test suite: 1/1 passed
seeds test suite: 13/13 passed

## Ledger updates
- journal: appended
- metrics: appended
- touched files: appended
- backlog: appended (hooks-throw-timeout deferred)

## Refactor signal
NONE
