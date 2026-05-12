# Epoch 13 summary

## Selected target
- ID: no-test-select-parent-plus
- Priority class / dimension: determinism / Determinism
- Why now: No regression test existed for `--select parent+` with dynamically spawned descendants — a critical DAG determinism gap. Higher ranks (crash/stall, state/lifecycle) were clean. The deprecation-warning-spam finding was rejected as same failure class as epoch 11.

## Patch
- Files changed:
  - `.converge/playbooks/self-improvement-loop/templates/epoch/tasks/implement/TASK.md`
  - `tests/playbook-dag.test.ts`
  - `tests/test-select-parent-plus/.converge/playbooks/default/playbook.yml`
  - `tests/test-select-parent-plus/.converge/playbooks/default/tasks/parent/TASK.md`
  - `tests/test-select-parent-plus/.converge/playbooks/default/tasks/parent/seeds/spawn.seed.js`
  - `tests/test-select-parent-plus/.converge/project.yaml`
- Regression added: yes
- Summary: Added a regression test verifying that `--select parent+` includes dynamically spawned descendants in DAG selection. Test-only addition — no production code changed.

## Verification
- Result: PASSED
- Commands:
  - `pnpm --filter @converge/cli build` → 0
  - `pnpm --filter @converge/core build` → 0
  - `pnpm vitest run tests/playbook-compile.test.ts tests/playbook-dag.test.ts` → 0
  - `pnpm vitest run tests/playbook-loop-seed.test.ts` → 0
  - `pnpm vitest run tests/playbook-seeds.test.ts` → 0

## Metrics / ledger movement
- Journal appended: yes
- Metrics appended: yes
- Touched files appended: yes
- Backlog changes: none

## Next maintainer note
- Continue with: Lower-priority findings (deprecation-warning deduplication from epoch 11 and re-observed in epoch 13 may need a follow-up if it persists across multiple epochs).
- Avoid repeating: Deprecation-warning-spam as a standalone target — it is the same failure class as epoch 11 and violates the anti-repeat policy.
- Escalate if: `--select parent+` breaks on dynamically spawned children despite the new regression test.
