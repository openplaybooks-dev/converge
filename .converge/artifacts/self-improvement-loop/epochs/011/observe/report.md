# Observation Report — Epoch 011

**Timestamp:** 2026-05-12T14:38:00+07:00

## Probes

### Build

| Target | Result |
|--------|--------|
| `pnpm --filter @converge/cli build` | pass |
| `pnpm --filter @converge/core build` | pass |

### Test Inventory

```
tests/claudefn-timeout.test.ts
tests/cli-help.test.ts
tests/codex-backend.test.ts
tests/codex-real.test.ts
tests/codex-real-runner.test.ts
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

### Test Runs

| Command | Result |
|---------|--------|
| `pnpm vitest run tests/playbook-compile.test.ts` | pass (104 tests) |
| `pnpm vitest run tests/playbook-dag.test.ts` | pass (16 tests) |
| `pnpm vitest run tests/playbook-seeds.test.ts` | pass (13 tests) |
| `pnpm vitest run tests/playbook-loop-seed.test.ts` | pass (1 test) |

### CLI Help

`node packages/cli/dist/index.js --help` — pass, clean output listing EXECUTE, INSPECT, MANAGE commands with selection flags.

### Maintainer Probe: Provider/Production Readiness

`node packages/cli/dist/index.js run --playbook self-improvement-loop --dry`:

- DAG discovery: 9 nodes, clean
- **ISSUE:** `run.mode is deprecated and ignored` warning repeated **13 times** — once per task in DAG. This is noise that buries real warnings.
- **ISSUE:** 3 playbooks fail to load: `smoke-test`, `test-progress-curl`, `test-progress-fresh` — all missing `tasks/` directory. These are stale playbook directories.

### Ledger Status

- `journal.md`: 38 lines, epochs 1–5 recorded
- `metrics.jsonl`: 6 entries, epochs 1–5 (epoch 003 duplicated)
- `backlog.jsonl`: empty (0 lines)
- `touched-files.jsonl`: 94 entries, epochs 1–5 (no entries for epochs 008–010)

### Escalation Check

Last two epochs in metrics:
- Epoch 4: "escalation-duplicate-epochs" (low-value, files_changed=2)
- Epoch 5: "runstate-missing-crash" (meaningful, files_changed=24)

Both epochs 4 and 5 touched overlapping test files (`playbook-loop-seed.test.ts`, `playbook-seeds.test.ts`). The touched-files ledger has no entries for epochs 008–010, suggesting those epochs either didn't run or didn't update ledgers.
