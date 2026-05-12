# Epoch 5 summary

## Selected target
- ID: runstate-missing-crash
- Priority class / dimension: lifecycle / Correctness
- Why now: Highest-priority finding (rank 1). run() crashes with ENOENT when runstate.json is missing and dry:true is set. Not cosmetic — Epoch 4 was cosmetic (duplicate entries), so selecting a real correctness fix now avoids two consecutive cosmetic epochs.

## Patch
- Files changed: packages/core/src/run.ts, packages/core/src/manifest/run-state-manager.ts, packages/core/src/executor/seed-executor.ts, tests/playbook-loop-seed.test.ts
- Regression added: no
- Summary: Guard the runstate read path so that a missing runstate.json is treated as all-pending instead of throwing ENOENT. The fix is in run.ts with support changes in run-state-manager.ts and seed-executor.ts. One test path was updated in playbook-loop-seed.test.ts to match the new flat spawned-task directory layout.

## Verification
- Result: pass
- Commands:
  - `pnpm --filter @converge/cli build` → 0
  - `pnpm --filter @converge/core build` → 0
  - `pnpm vitest run tests/playbook-run-lock.test.ts tests/playbook-seeds.test.ts tests/playbook-loop-seed.test.ts` → 0 (3 files, 16 tests passed)

## Metrics / ledger movement
- Journal appended: yes
- Metrics appended: yes
- Touched files appended: yes
- Backlog changes: none

## Next maintainer note
- Continue with: Correctness-focused improvements — the lifecycle/cache path has been hit twice now (epoch 003, epoch 005).
- Avoid repeating: Cosmetic-only epochs. Epoch 4 was cosmetic; epoch 5 was a real crash fix. Keep alternating or prioritizing severity.
- Escalate if: runstate-related crashes reappear, or if the journal duplicate-entry issue (epoch 003 duplicated after epoch 5) persists through another epoch.
