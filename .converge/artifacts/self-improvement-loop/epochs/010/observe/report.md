# Observation Report — Epoch 10

## Probes

### Builds

```
pnpm --filter @converge/cli build  → pass (ESM build success, 4307ms)
pnpm --filter @converge/core build → pass (ESM build success, 7684ms)
```

### Test inventory

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

### Test runs

| Command | Result |
|---|---|
| `npx vitest run tests/playbook-compile.test.ts` | pass (104 tests) |
| `npx vitest run tests/playbook-dag.test.ts` | pass (16 tests) |
| `npx vitest run tests/playbook-seeds.test.ts` | pass (13 tests) |
| `npx vitest run tests/playbook-loop-seed.test.ts` | pass (1 test) |
| `npx vitest run tests/playbook-run-lock.test.ts` | pass (2 tests) |
| `npx vitest run tests/playbook-hooks.test.ts` | **FAIL** (1 failed timeout, 4 passed) |

### CLI --help

```
node packages/cli/dist/index.js --help → pass
```

Output shows full usage with EXECUTE, INSPECT, MANAGE, SELECTION FLAGS, GLOBAL OPTIONS, and EXAMPLES sections.

### Ledgers

- `journal.md`: exists (1274 bytes), covers epochs 1-5
- `metrics.jsonl`: exists (2063 bytes), 7 entries
- `backlog.jsonl`: exists, empty (0 bytes)
- `touched-files.jsonl`: exists (12654 bytes), 94 entries

## What passed

- Build pipeline (cli + core) is clean
- Core test suites (compile, DAG, seeds, loop-seed, run-lock): all pass
- CLI help output is complete and well-structured
- All ledgers present and well-formed

## What failed

- `tests/playbook-hooks.test.ts`: `should handle hooks that throw without blocking downstream` times out at 10000ms. This is a Rank 1 finding — reproducible test timeout indicating a stall in hook error handling.

## Surprising behavior

- `pnpm test` from root fails because `packages/codets` can't load vitest config — root-level vitest wasn't installed (fixed during observation). Individual test invocation works.
- The `touched-files.jsonl` has duplicate entries for epoch 003 (epoch 003 appears twice with identical file lists). This suggests the verify stage double-counted.
- `backlog.jsonl` is empty despite 5 epochs of completed fixes — no deferred/backlogged items tracked.
