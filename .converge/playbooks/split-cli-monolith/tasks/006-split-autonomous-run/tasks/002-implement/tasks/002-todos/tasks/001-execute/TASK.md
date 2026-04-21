---
id: 001-execute
title: "Execute: 1180-line autonomous-run moves into orchestrator/autonomous/ as 5 files + barrel. Root src/index.ts autonomousRun export path hard-breaks."
---

Implement the PR.

**Summary:** 1180-line autonomous-run moves into orchestrator/autonomous/ as 5 files + barrel. Root src/index.ts autonomousRun export path hard-breaks.

**Spec:**
Move `packages/core/src/cli/autonomous-run.ts` (1180 L) → `packages/core/src/orchestrator/autonomous/` and split into focused modules.

**Target split:**

| New file                                   | Lines | Contents                                                                                    |
| ------------------------------------------ | ----- | ------------------------------------------------------------------------------------------- |
| `orchestrator/autonomous/types.ts`         | ~80   | `AutonomousRunConfig`, `AutonomousRunResult`, `TreeSnap`                                    |
| `orchestrator/autonomous/snap.ts`          | ~50   | `snapTree`                                                                                   |
| `orchestrator/autonomous/recovery.ts`      | ~500  | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks`, `recoverFailedTasks`, `collectCheckpointsRecursive` |
| `orchestrator/autonomous/dirty-session.ts` | ~120  | `DIRTY_SESSION_STATUSES`, `formatAge`, `getLastSessionMetadata`, `guardDirtySession`         |
| `orchestrator/autonomous/run-loop.ts`      | ~350  | `autonomousRun` main body                                                                    |
| `orchestrator/autonomous/index.ts`         | barrel | re-export public API                                                                         |

**Import sites to update (4) — HARD BREAK on public path:**
- `packages/core/src/cli/commands-run.ts`
- `packages/core/src/converge/converge-runner.ts`
- `packages/core/src/evolve/evolve-runner.ts`
- `packages/core/src/index.ts` — `autonomousRun` re-export path changes; no shim

**ESLint rule (added this PR):**

`no-restricted-imports` banning `../cli/*` from `tree/`, `orchestrator/`, `checkpoint/`, `journal/`. Prevents future regressions — non-CLI code cannot pull CLI-layer modules.

**Acceptance:**
- PR1 autonomous-run suites green
- Every split file ≤500 lines
- swebench + tbench tests green (proves public API via `@converge/core` intact)
- Downstream of `import { autonomousRun } from '@converge/core'` still works (symbol name unchanged, re-export path updated)
- `pnpm -r build` + `pnpm -r test` green
- `madge --circular packages/core/src/orchestrator` — no cycles

**Analysis:** `D:/converge/.converge/artifacts/split-cli/006-split-autonomous-run/analyze/plan.md`
