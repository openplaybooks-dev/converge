# Epoch 003 Selection Report

## Selected target

Selected `missing-output-cache-invalidation-coverage` from `observe/findings.json`.

Maintainer rationale: the observe probes all passed for build, compile, DAG, seed, loop-seed, run-lock, and CLI help paths, so there is no failing crash or stalled run to triage first. The strongest remaining production-readiness gap is lifecycle correctness around stale task completion when a declared output is deleted. That path can hide broken artifacts while reporting success, and it is small enough for one reviewable regression-first epoch.

## Rejected alternatives

- Build-warning / unused-import noise: explicitly lower priority and disallowed as standalone cleanup while lifecycle correctness coverage is available.
- Additional compile or DAG changes: existing focused compile and DAG suites passed during observation, and epoch 2 already covered determinism/selection behavior.
- API/provider configuration errors: epoch 1 already addressed invalid model configuration errors with `tests/mixed-model.test.ts`, so repeating that class would be lower leverage.

## Test mapping

Affected runner/cache lifecycle behavior maps to:

`pnpm vitest run tests/playbook-loop-seed.test.ts tests/playbook-seeds.test.ts tests/playbook-run-lock.test.ts`
