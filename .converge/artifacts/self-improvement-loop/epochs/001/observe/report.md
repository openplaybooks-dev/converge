# Observation report — epoch 001

## Ledger review

Existing ledgers were requested first, but none were present on disk:

- `.converge/artifacts/self-improvement-loop/journal.md`: missing
- `.converge/artifacts/self-improvement-loop/metrics.jsonl`: missing
- `.converge/artifacts/self-improvement-loop/backlog.jsonl`: missing
- `.converge/artifacts/self-improvement-loop/touched-files.jsonl`: missing

## Required probes

- `pnpm --filter @converge/cli build`: pass. Built `packages/cli`; tsup reported only unused-import warnings in generated output.
- `pnpm --filter @converge/core build`: pass. Built `packages/core`; tsup reported only unused-import warnings in generated output.
- `find tests -maxdepth 1 -name '*.test.ts' | sort`: pass. Top-level inventory includes playbook compile/DAG/seed tests plus CLI/model-related tests.
- `pnpm vitest run tests/playbook-compile.test.ts`: pass, 88 tests.
- `pnpm vitest run tests/playbook-dag.test.ts`: pass, 16 tests.
- `pnpm vitest run tests/playbook-seeds.test.ts`: pass, 13 tests.
- `pnpm vitest run tests/playbook-loop-seed.test.ts`: pass, 1 test.
- `node packages/cli/dist/index.js --help`: pass. Help renders top-level usage and commands.

## Maintainer finding

The cheap baseline probes all passed, so the selected maintainer-grade target is regression coverage for invalid provider/model configuration, a critical API/DX path called out by the task's probe menu. The failure mode matters because users need actionable errors before any agent work begins; unclear provider/model failures waste runs and can obscure configuration mistakes.

Recommended next step: add/strengthen a focused regression around invalid model/provider configuration and ensure the factory/CLI path surfaces a concise actionable error.
