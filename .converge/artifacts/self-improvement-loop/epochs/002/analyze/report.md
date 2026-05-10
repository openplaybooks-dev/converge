# Selection report — epoch 002

Selected `select-parent-plus-spawned-coverage` from `observe/findings.json`.

## Maintainer rationale

The observation probes show the builds and existing focused suites are green, but they also identify a high-severity determinism coverage gap: the loop seed test asserts spawned task files exist after `--select improve+`, yet does not prove dynamically spawned descendants are actually executed after materialization. That is a small, reviewable regression in a critical selection path and does not repeat epoch 1's API/provider configuration work.

## Rejected alternatives

- Failing test/crash/root cause: rejected because the epoch 002 observation probes passed.
- Lifecycle/runstate fixes: rejected because no lifecycle failure was observed in this epoch's artifacts.
- Build-warning or help-text cleanup: rejected as lower-value and explicitly disallowed while a determinism regression gap exists.

## Test mapping

Primary command: `pnpm vitest run tests/playbook-loop-seed.test.ts`.
Mapped seed coverage is also listed as an acceptance check: `pnpm vitest run tests/playbook-seeds.test.ts`.
