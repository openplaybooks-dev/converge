# Epoch 003 Observe Report

## Command evidence

- `pnpm --filter @converge/cli build`: pass. Build completed; tsup reported unused `fs` imports in the bundled CLI output but exited successfully.
- `pnpm --filter @converge/core build`: pass. Build completed; tsup reported unused imports in generated bundles but exited successfully.
- `find tests -maxdepth 1 -name '*.test.ts' | sort`: found 13 top-level test files, including playbook compile/DAG/seed/loop/run-lock coverage.
- `pnpm vitest run tests/playbook-compile.test.ts`: pass, 88 tests.
- `pnpm vitest run tests/playbook-dag.test.ts`: pass, 16 tests.
- `pnpm vitest run tests/playbook-seeds.test.ts`: pass, 13 tests.
- `pnpm vitest run tests/playbook-loop-seed.test.ts`: pass, 1 test covering incremental loop seed re-runs.
- `pnpm vitest run tests/playbook-run-lock.test.ts`: pass, 1 test covering stale lock cleanup.
- `node packages/cli/dist/index.js --help`: pass. Help renders command groups and selection/global options.

## Ledger evidence

Existing ledgers show epochs 1 and 2 both passed and already covered two high-priority areas from the observe menu:

- Epoch 1 selected `invalid-model-config-errors` with regression coverage in `tests/mixed-model.test.ts`.
- Epoch 2 selected `select-parent-plus-spawned-coverage` with regression coverage in `tests/playbook-loop-seed.test.ts`.
- `touched-files.jsonl` shows broad repeated framework and self-improvement files across both prior epochs.

## What passed

The required build and focused regression probes passed. Existing tests cover compile behavior, DAG semantics, seed materialization, loop-seed re-runs, and stale run-lock cleanup. CLI help is operational.

## Finding

The strongest maintainer-grade target is regression coverage for cache invalidation after deleting declared outputs in a copied fixture. This is a lifecycle correctness path called out by the task's required maintainer probe menu, and it remains higher value than cosmetic build-warning cleanup. The current targeted probes demonstrate adjacent coverage but do not prove that a task with missing declared outputs is forced to re-run instead of being treated as complete from stale state.

## Surprising behavior

No command failed during observation. The only noise was tsup unused-import warnings; these are not selected because lifecycle/cache correctness is a higher-ranked maintainer concern.
