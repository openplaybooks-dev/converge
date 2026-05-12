# Observation Report — Epoch 008

## Probes Executed

### Build

```
pnpm --filter @converge/cli build
```
**PASS.** CLI built in 4172ms (4.39 MB ESM output). Warnings for unused imports (`openSync`, `fsyncSync`, `closeSync` from `fs`) but no errors.

```
pnpm --filter @converge/core build
```
**PASS.** Core built in 7524ms (8 output files). Same unused-import warnings across multiple entry points. No errors.

### Test Inventory

```
find tests -maxdepth 1 -name '*.test.ts' | sort
```
**PASS.** 15 test files found:
- `tests/claudefn-timeout.test.ts`
- `tests/cli-help.test.ts`
- `tests/codex-backend.test.ts`
- `tests/codex-real.test.ts`
- `tests/codex-real-runner.test.ts`
- `tests/compile-discover.test.ts`
- `tests/deepcode-backend.test.ts`
- `tests/deepseek-opencode.test.ts`
- `tests/mixed-model.test.ts`
- `tests/no-goals.test.ts`
- `tests/playbook-compile.test.ts`
- `tests/playbook-dag.test.ts`
- `tests/playbook-hooks.test.ts`
- `tests/playbook-loop-seed.test.ts`
- `tests/playbook-run-lock.test.ts`
- `tests/playbook-seeds.test.ts`

### Root-Level Test Execution

```
pnpm vitest run tests/playbook-compile.test.ts
pnpm vitest run tests/playbook-dag.test.ts
pnpm vitest run tests/playbook-seeds.test.ts
pnpm vitest run tests/playbook-loop-seed.test.ts
```
**FAIL.** `vitest` is not recognized at the project root. Root `package.json` has no vitest devDependency. Running from packages with vitest (e.g., `packages/core`) fails because package-level vitest configs only include `tests/**/*.test.ts` relative to the package, not the root.

### CLI Help

```
node packages/cli/dist/index.js --help
```
**PASS.** CLI starts and displays full help with commands (run, add, list, show, inspect, init, clean), selection flags, and examples.

## Ledger Review

Read existing ledgers from `.converge/artifacts/self-improvement-loop/`:

- **journal.md**: 6 entries (epochs 1-5, with 003 duplicated). All recorded as "pass". No refactor signals.
- **metrics.jsonl**: 6 entries. All `test_result: "pass"`, all `test_command` values use `pnpm vitest run tests/...` form. Contradiction: these commands cannot currently execute at root.
- **backlog.jsonl**: Empty.
- **touched-files.jsonl**: Epochs 4 and 5 touched different file sets. Epoch 5 touched `packages/core/src/run.ts` plus repo-split playbook files; epoch 4 touched documentation/i18n files. No duplicate-file escalation pattern.

## Summary

| Probe | Result |
|---|---|
| CLI build | PASS |
| Core build | PASS |
| Test file inventory | PASS (15 files) |
| Root-level vitest execution | FAIL (vitest not installed at root) |
| CLI help | PASS |

**Surprising behavior:** The root `vitest.config.ts` imports from `vitest/config` but vitest is only available inside individual workspace packages. The `pnpm vitest run tests/...` commands recorded in `metrics.jsonl` for epochs 1-5 cannot execute at root as written. Either the metrics were recorded without verification, or vitest was previously hoisted to root and has since been removed.
