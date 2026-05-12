# Verify — Epoch 19

**Result:** FAILED

## Selected improvement
- ID: compile-non-deterministic-timestamp
- Goal: Root-cause fix: make compile output deterministic by stripping the generated_at timestamp from manifest.json so two compiles of the same playbook produce identical output
- Dimension: Determinism
- Files changed: 7 (plus 1 bogus entry "1'" in manifest)
- Test command: pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts

## Commands run
| Command | Exit code | Result | Notes |
|---|---:|---|---|
| pnpm --filter @converge/cli build | 0 | PASS | index.js 4.39 MB |
| pnpm --filter @converge/core build | 0 | PASS | 6 ESM outputs |
| pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts | 1 | FAIL | 120 passed, 1 failed |
| pnpm vitest run tests/playbook-loop-seed.test.ts tests/playbook-seeds.test.ts | 0 | PASS | 14 passed |

## Evidence

### Failing test
```
FAIL  tests/playbook-dag.test.ts > select parent+ with dynamic spawn DAG > --select parent+ includes dynamically spawned children in DAG selection
AssertionError: expected false to be true // Object.is equality
 ❯ tests/playbook-dag.test.ts:257:78
     expect(existsSync(join(JOURNAL_DIR, "tasks", "child-alpha", "TASK.md"))).toBe(true);
     expect(existsSync(join(JOURNAL_DIR, "tasks", "child-beta", "TASK.md"))).toBe(true);
```

### CLI build
```
ESM dist\index.js 4.39 MB
Build success in 4293ms
```

### Core build
```
ESM Build success in 7998ms (6 entry points)
```

### Regression tests passed
- playbook-compile.test.ts: all passed
- playbook-loop-seed.test.ts: all passed (14 tests)
- playbook-seeds.test.ts: all passed

## Ledger updates
- journal: appended
- metrics: appended
- touched files: appended
- backlog: none

## Refactor signal
NONE
