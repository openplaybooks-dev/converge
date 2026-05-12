# Observation Report — Epoch 006

## Build

| Package | Result |
|---------|--------|
| @converge/cli | pass |
| @converge/core | pass |

## Test Inventory

16 test files under `tests/`:

```
tests/claudefn-timeout.test.ts
tests/cli-help.test.ts
tests/codex-backend.test.ts
tests/codex-real-runner.test.ts
tests/codex-real.test.ts
tests/compile-discover.test.ts
tests/deepcode-backend.test.ts
tests/deepseek-opencode.test.ts
tests/mixed-model.test.ts
tests/no-goals.test.ts
tests/playbook-compile.test.ts
tests/playbook-dag.test.ts
tests/playbook-hooks.test.ts
tests/playbook-loop-seed.test.ts
tests/playbook-run-lock.test.ts
tests/playbook-seeds.test.ts
```

## Required Probes

| Command | Result |
|---------|--------|
| `pnpm vitest run tests/playbook-compile.test.ts` | pass (104 tests) |
| `pnpm vitest run tests/playbook-dag.test.ts` | pass (16 tests) |
| `pnpm vitest run tests/playbook-seeds.test.ts` | pass (13 tests) |
| `pnpm vitest run tests/playbook-loop-seed.test.ts` | pass (1 test) |
| `node packages/cli/dist/index.js --help` | pass |

## Ledger Review

- **journal.md**: 6 entries. Duplicate Epoch 003 entry present. Last two epochs (4, 5) marked `regression_added: false`.
- **metrics.jsonl**: 6 entries. Epoch 003 duplicated. All epochs pass. Epoch 5 touched 24 files with no regression added.
- **backlog.jsonl**: Empty (0 bytes).
- **touched-files.jsonl**: 94 lines. Epoch 003 entries duplicated (lines 42-56 duplicate 27-41). `packages/core/src/run.ts` touched in epochs 2, 3, 5. `tests/playbook-loop-seed.test.ts` touched in epochs 3, 5.

## Maintainer Probe: mixed-model (invalid config + multi-provider)

`pnpm vitest run tests/mixed-model.test.ts`:
- 6/7 pass, 1 fail: `completes with 2 ok` assertion is stale
- Framework output: `Done: 4 ok, 0 failed` (DAG now includes root-diverge + root-converge nodes)
- Test expects `Done: 2 ok, 0 failed` — assertion drift from DAG expansion
- Unhandled error: Vitest worker timeout on `onTaskUpdate` (infra, not framework)

## Maintainer Probe: run-lock lifecycle

`pnpm vitest run tests/playbook-run-lock.test.ts`: pass (2 tests)
- Cache invalidation on missing output: covered
- Only 2 tests total — thin coverage for lifecycle dimension

## Summary

All 136 framework tests pass across 6 test files. The one failure in mixed-model is a stale test assertion, not a framework bug. The loop has produced no failing-tests/crashes/stalls (rank 1) or lifecycle correctness issues (rank 2) for two consecutive epochs. Both epoch 4 and epoch 5 were `regression_added: false`, touching overlapping core files (`packages/core/src/run.ts`) without expanding regression coverage. Escalation is warranted.
