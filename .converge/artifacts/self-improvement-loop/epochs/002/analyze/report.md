# Selection Report — Epoch 2

## Selected: hooks-throw-timeout

**Rationale**: Priority 1 failing-test root cause. The E2E hook test `should handle hooks that throw without blocking downstream` times out after 10 seconds. This is a correctness bug: a throwing hook on one task should not block downstream tasks. The hook error isolation boundary is broken.

## Rejected alternatives

- **select-parent-plus-missing-children**: Excluded as repeat of the epoch 1 selected target. The check-selection-quality gate blocks re-selecting the same ID. The epoch 1 fix did not pass tests; this needs a fresh approach in a future epoch or human triage.
- **No other findings available**: Both epoch 2 findings are repeats from epoch 1. hooks-throw-timeout was deferred (not attempted) in epoch 1, making it the only eligible target.

## Maintainer assessment

- **Priority rank**: 1 (failing test / stalled run — timeout is a stall)
- **Evidence**: Reproducible timeout at tests/playbook-hooks.test.ts:225
- **Risk**: Low — the fix is scoped to hook error isolation in hook-definition.ts and dag/hook-nodes.ts
- **Anti-repeat**: This is NOT a repeat of epoch 1's selected work (DAG determinism); it targets a different bug class (hook lifecycle correctness vs. DAG selection)
- **Test strategy**: Focused regression in the existing hook test suite
