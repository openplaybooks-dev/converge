# Epoch 012 Selection Report

## Selected: hooks-throw-timeout

**Priority rank:** 1 (failing test / stalled run root cause)

**Evidence:** `pnpm vitest run tests/playbook-hooks.test.ts` — 1 of 5 tests failed with a 10000ms timeout on "should handle hooks that throw without blocking downstream" (line 225). The test expects throwing hooks to not block downstream tasks, but the process hangs instead, indicating an unsettled promise or held lock in the hook execution path.

## Rejected alternatives

No other findings were present in `observe/findings.json` — only one finding was observed. The single finding is high-value: a real correctness bug with a failing regression test already in place.

## Higher-priority analysis

- **Rank 1 (failing test/crash/stalled run):** This finding itself qualifies. No higher finding exists.
- **Rank 2 (state/lifecycle):** No lifecycle crash observed. Probes for run-lock, loop-seed, seeds, compile, and DAG all pass.
- **Rank 3 (DAG/seed determinism):** No determinism regression observed.
- **Rank 4 (provider/runtime):** No provider or child-process cleanup failures observed.
- **Rank 5 (API contract):** No API drift observed.
- **Rank 6 (docs/DX):** Not applicable given a rank-1 finding exists.

## Anti-repeat check

- Last two epochs: 11 (Production Readiness — deprecation warning dedup) and 5 (Correctness — runstate-missing-crash).
- This is a different failure class (hook promise lifecycle vs. runstate deserialization vs. logger dedup).
- `packages/core/src/run.ts` appears in epochs 2, 003, 5, and 11, but each addressed a distinct concern. This patch targets a specific, isolated promise-resolution gap in the hook path.

## Test mapping

- Affected area: `packages/core/src/run.ts` (hook execution), `tests/playbook-hooks.test.ts`
- Focused command: `pnpm vitest run tests/playbook-hooks.test.ts`
- Regression: `pnpm vitest run tests/playbook-hooks.test.ts tests/playbook-compile.test.ts tests/playbook-dag.test.ts`
