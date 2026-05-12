# Epoch 11 summary

## Selected target
- ID: run-mode-deprecation-warning-spam
- Priority class / dimension: production / Production Readiness
- Why now: `run --playbook self-improvement-loop --dry` emitted `run.mode is deprecated and ignored` 13 times — once per task in a 9-node DAG — drowning 3 real playbook load failures in noise

## Patch
- Files changed: `.converge/playbooks/self-improvement-loop/tasks/improve/seeds/epoch.seed.js`, `package.json`, `packages/core/src/navigator/repair/strategies/seed-script-repair.ts`, `packages/core/src/run.ts`, `pnpm-lock.yaml`, `run-self-improvement.mjs`
- Regression added: no
- Summary: Root-cause fix — deduplicate repeated `run.mode` deprecation warnings at the logger level so actual warnings are visible during dry runs

## Verification
- Result: PASSED
- Commands:
  - `pnpm --filter @converge/cli build` → 0
  - `pnpm --filter @converge/core build` → 0
  - `pnpm vitest run tests/playbook-loop-seed.test.ts tests/playbook-seeds.test.ts tests/playbook-compile.test.ts` → 0 (118 tests)

## Metrics / ledger movement
- Journal appended: yes
- Metrics appended: yes
- Touched files appended: yes
- Backlog changes: none

## Next maintainer note
- Continue with: higher-priority issues (rank 1–3) if any surface in future observation rounds
- Avoid repeating: production-readiness noise fixes on the same file unless evidence of regression
- Escalate if: deprecation warning spam pattern returns or new warning categories appear
