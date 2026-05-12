# Selection Report — Epoch 017

## Selected: hook-timeout-017

**Priority class:** Correctness (failing test root cause — priority rank 1)

**dimension:** Correctness

**Evidence:** `pnpm vitest run tests/playbook-hooks.test.ts` times out at `tests/playbook-hooks.test.ts:225:3` after 10000ms. The test `"should handle hooks that throw without blocking downstream"` calls `reset()` inside an async `it()` block and never resolves. Confirmed by metrics.json: 141/142 tests pass, this is the sole failure.

## Rejected alternatives

### select-plus-operator-017 (rank 3, Determinism)

`--select "epoch-013+"` returns no matches. Rejected as lower priority (rank 3 vs rank 1). A failing test root cause always takes precedence. This should be re-evaluated in the next epoch after the hook timeout is resolved.

### run-mode-deprecation-noise-017 (rank 6, DX)

Disallowed. Epoch 11 already targeted `run-mode-deprecation-warning-spam` — this is the same failure class. Per anti-repeat policy, consecutive epochs targeting the same bug class are prohibited.

## Maintainer rationale

One failing test (1/142) is the clearest correctness signal available. The hook timeout is a real test hang — a regression in hook error-handling behavior that blocks downstream task execution. Fixing it is a small, reviewable patch: isolate why `reset()` never resolves in the async hook context and apply a minimal fix. The existing test serves as the regression guard. Risk is low because the change is scoped to hook error-handling and gated by the existing test suite.
