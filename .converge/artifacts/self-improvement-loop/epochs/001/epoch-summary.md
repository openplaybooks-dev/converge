# Epoch 1 summary

## Selected target
- ID: select-parent-plus-missing-children
- Priority class / dimension: Determinism
- Why now: Failing test in tests/playbook-dag.test.ts at line 257 — `--select parent+` does not include dynamically spawned children (`child-alpha`, `child-beta`). Rank 1 finding, priority tier #3 (DAG/seed determinism). hooks-throw-timeout was the other rank-1 candidate but rejected for scope.

## Patch
- Files changed: 15
- Regression added: no
- Summary: Fix `--select parent+` to include dynamically spawned children in DAG selection. Implementation touched DAG traversal in packages/core, CLI clean commands, seed/run modules, and test files.

## Verification
- Result: FAILED — the same test still fails
- Commands:
  - `pnpm --filter @converge/cli build` → 0
  - `pnpm --filter @converge/core build` → 0
  - `pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts` → 1
  - `pnpm vitest run tests/playbook-loop-seed.test.ts` → 0
  - `pnpm vitest run tests/playbook-seeds.test.ts` → 0
  - `pnpm vitest run tests/cli-help.test.ts` → 0

## Metrics / ledger movement
- Journal appended: yes
- Metrics appended: yes
- Touched files appended: yes
- Backlog changes: added hooks-throw-timeout

## Next maintainer note
- Continue with: The `--select parent+` DAG bug — child-alpha and child-beta TASK.md files are still not created after parent+ selection
- Avoid repeating: The same traversal fix approach; verify whether the issue is in selection logic vs. child spawning/compilation
- Escalate if: The bug persists after 2 more epochs
