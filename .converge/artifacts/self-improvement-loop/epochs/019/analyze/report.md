# Epoch 19 Selection Report

## Selected: `compile-non-deterministic-timestamp`

**Priority class:** determinism (rank 3 in maintainer policy)
**Rationale:** Two sequential compiles of the same playbook produce different manifest.json due to `generated_at` timestamp. This violates determinism — a core property for reproducible builds, CI caching, and `--select` correctness audit trails.

## Rejected alternatives

### `hook-throw-hangs-run` (rank 1, critical)
**Rejected:** Same failure class as epoch 17 (`hook-timeout-017` — both target `tests/playbook-hooks.test.ts` hook timeout behavior). Anti-repeat rule blocks consecutive or near-consecutive selections in the same failure class. This needs a root-cause fix but must not be re-selected until a different class of work has been completed.

### `scripts-use-process-exit` (rank 4, medium)
**Rejected:** Lower priority than the determinism issue. Process.exit hardening is production-readiness work but less evidence-backed (static grep findings vs. a concrete reproduction). Can be addressed after determinism is fixed.

### `select-range-operator-no-match` (rank 5, low)
**Rejected:** Lowest priority API issue. The `+` operator returning empty for epoch-prefixed IDs may be a parsing bug but has no known user impact yet. Deferred.

## Priority ladder check

| Priority | Finding | Status |
|----------|---------|--------|
| 1. Failing test/crash | hook-throw-hangs-run | Blocked by anti-repeat (same class as epoch 17) |
| 2. State/lifecycle | — | Clean — no findings |
| 3. DAG/seed determinism | compile-non-deterministic-timestamp | **SELECTED** |
| 4. Provider/runtime production | scripts-use-process-exit | Lower priority, deferred |
| 5. API contract | select-range-operator-no-match | Lower priority, deferred |
| 6. Docs/DX | — | No findings |

## Test strategy

`pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts` — compile twice, assert manifests are identical. Add a regression test before fixing.
