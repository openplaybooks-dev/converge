---
id: 004-quality
title: Quality gate — PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd D:/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd D:/converge && pnpm test 2>&1 | tail -1"
  - id: cli-smoke
    description: converge --help runs (tolerates pre/post-PR13 bin location)
    cmd: "cd D:/converge && node packages/core/dist/cli/main.js --help >/dev/null 2>&1 || node packages/cli/dist/main.js --help >/dev/null 2>&1"
vars:
  taskId: 004-quality
  parentId: 006-split-autonomous-run
  title: PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/
  tier: 2 — In-core reorg
  task: 1180-line autonomous-run moves into orchestrator/autonomous/ as 5 files + barrel. Root src/index.ts autonomousRun export path hard-breaks.
  spec: "Move `packages/core/src/cli/autonomous-run.ts` (1180 L) → `packages/core/src/orchestrator/autonomous/` and split into focused modules.\n\n**Target split:**\n\n| New file                                   | Lines | Contents                                                                                    |\n| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------- |\n| `orchestrator/autonomous/types.ts`         | ~80   | `AutonomousRunConfig`, `AutonomousRunResult`, `TreeSnap`                                    |\n| `orchestrator/autonomous/snap.ts`          | ~50   | `snapTree`                                                                                   |\n| `orchestrator/autonomous/recovery.ts`      | ~500  | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks`, `recoverFailedTasks`, `collectCheckpointsRecursive` |\n| `orchestrator/autonomous/dirty-session.ts` | ~120  | `DIRTY_SESSION_STATUSES`, `formatAge`, `getLastSessionMetadata`, `guardDirtySession`         |\n| `orchestrator/autonomous/run-loop.ts`      | ~350  | `autonomousRun` main body                                                                    |\n| `orchestrator/autonomous/index.ts`         | barrel | re-export public API                                                                         |\n\n**Import sites to update (4) — HARD BREAK on public path:**\n- `packages/core/src/cli/commands-run.ts`\n- `packages/core/src/converge/converge-runner.ts`\n- `packages/core/src/evolve/evolve-runner.ts`\n- `packages/core/src/index.ts` — `autonomousRun` re-export path changes; no shim\n\n**ESLint rule (added this PR):**\n\n`no-restricted-imports` banning `../cli/*` from `tree/`, `orchestrator/`, `checkpoint/`, `journal/`. Prevents future regressions — non-CLI code cannot pull CLI-layer modules.\n\n**Acceptance:**\n- PR1 autonomous-run suites green\n- Every split file ≤500 lines\n- swebench + tbench tests green (proves public API via `@converge/core` intact)\n- Downstream of `import { autonomousRun } from '@converge/core'` still works (symbol name unchanged, re-export path updated)\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/core/src/orchestrator` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR5 — Move + split cli/autonomous-run.ts → orchestrator/autonomous/

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
