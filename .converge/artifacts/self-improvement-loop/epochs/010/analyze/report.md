# Selection Report — Epoch 10

## Selected: `hooks-throw-timeout`

**Priority rank 1 — Correctness.** A hook error handling test times out at 10000ms,
indicating a Promise stall when a hook throws. This is the only finding from
observation and the highest-priority item available.

## Rejected alternatives

**None.** Only one finding was produced by the observe stage. All higher priority
ranks (crash, stalled run) were checked and are clean — every other test suite
passes. No lower-priority alternatives exist to consider.

## Maintainer rationale

This is a textbook maintainer-grade fix:

- **Real correctness bug**: a hook that throws should not stall downstream
  execution. The test expects this but the implementation hangs.
- **Evidence-backed**: the failing test at `tests/playbook-hooks.test.ts:225`
  reproduces the stall deterministically.
- **Small surface**: the fix is likely a missing `.catch()` or unhandled Promise
  rejection in the hook execution path in `packages/core/src/run.ts`.
- **Not repetitive**: the last two epochs (004: ledger dedup, 005: runstate
  crash handling) are different failure classes within Correctness. `run.ts` has
  only been touched in epoch 005 (1 prior epoch, under the 3-epoch threshold).
- **Regression-ready**: the existing failing test becomes the regression check
  once the implementation is fixed.

## Anti-repeat verification

- `metrics.jsonl` shows epochs 004 (escalation-duplicate-epochs) and 005
  (runstate-missing-crash) — different failure classes from hook error handling.
- `touched-files.jsonl` shows `packages/core/src/run.ts` in epoch 005 only
  (1 hit, far below the 3-epoch refactor threshold).
- `backlog.jsonl` is empty — no deferred items to consider.
