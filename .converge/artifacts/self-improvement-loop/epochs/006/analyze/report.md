# Selection Report — Epoch 006

## Selected

**escalation-stagnant-loop** — Add regression coverage for stale manifest after fixture mutation.

## Rejected alternatives

- **No other findings available.** Only one finding was observed (`escalation-stagnant-loop`). All probes passed except `tests/mixed-model.test.ts` (stale test assertion, not a framework bug). No failing tests, crashes, or lifecycle issues were found.
- **Cosmetic cleanup rejected.** Build warnings (unused imports) are explicitly disallowed as standalone targets per maintainer policy.
- **Code edit rejected.** The last two epochs (4, 5) were both `regression_added: false`. Per escalation rules, directly editing code on the same files again without first adding regression coverage would repeat the pattern. This selection instead adds the missing regression.

## Maintainer rationale

Two consecutive epochs without regression coverage, touching overlapping core files (`packages/core/src/run.ts`, `tests/playbook-loop-seed.test.ts`), meets the escalation threshold. The correct response is not to edit code again but to add the guardrail that makes future repetition impossible: a regression test that detects manifest staleness after fixture mutation. This is a small, reviewable, high-leverage patch in the determinism dimension (priority rank 3), with higher priorities (ranks 1-2) confirmed clean.
