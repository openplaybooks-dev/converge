# Observation Report — Epoch 5

## Probes

### Build

| Target | Result |
|---|---|
| `pnpm --filter @converge/cli build` | pass |
| `pnpm --filter @converge/core build` | pass |

### Test inventory

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

### Test runs

| Command | Result |
|---|---|
| `pnpm vitest run tests/playbook-compile.test.ts` | pass (104 tests) |
| `pnpm vitest run tests/playbook-dag.test.ts` | pass (16 tests) |
| `pnpm vitest run tests/playbook-seeds.test.ts` | pass (13 tests) |
| `pnpm vitest run tests/playbook-loop-seed.test.ts` | pass (1 test) |
| `pnpm vitest run tests/playbook-run-lock.test.ts` | **FAIL** (1 passed, 1 failed) |

### CLI help

`node packages/cli/dist/index.js --help` — pass, help output renders correctly.

### Failing test details

```
FAIL  tests/playbook-run-lock.test.ts > playbook run lock interruption recovery > does not accept cached completion when a declared output is missing
Error: ENOENT: no such file or directory, lstat '.../runstate.json'
```

The test deletes `runstate.json` and the declared output after a successful run, then re-runs with `dry: true` to verify the cache is not used. The `run()` function crashes when it cannot find the previous runstate.

## Ledgers

- `journal.md`: 4 epochs recorded, all pass. Epoch 003 appears twice (duplicate entry).
- `metrics.jsonl`: 5 entries (epoch 003 duplicated). All pass.
- `touched-files.jsonl`: 68 entries across epochs 1–4. Last two epochs (003, 4) touched overlapping files; epoch 4 was cosmetic (i18n/docs + template fix).
- `backlog.jsonl`: empty.

## Surprising behavior

- Epoch 003 journal/metrics entries are duplicated — this was the escalation finding from epoch 4 but the duplication persists in the journal.
- `playbook-run-lock.test.ts` has a failing test related to cache invalidation when runstate is missing. This is directly in the area epoch 003 attempted to fix (lifecycle/cache invalidation), suggesting either a regression or incomplete fix.
