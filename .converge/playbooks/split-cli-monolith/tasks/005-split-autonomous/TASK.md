---
id: 005-split-autonomous
title: PR5 — Split src/orchestrator/autonomous.ts into 5 files + barrel
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 005-split-autonomous
  title: PR5 — Split src/orchestrator/autonomous.ts into 5 files + barrel
  tier: A
  task: Decompose the 1180-line autonomous-run.ts into focused modules.
  spec: "Split `packages/core/src/orchestrator/autonomous.ts` into:\n\n| New file | Lines | Source range |\n| --- | --- | --- |\n| `types.ts` | ~80 | `AutonomousRunConfig`, `AutonomousRunResult`, `TreeSnap` |\n| `snap.ts` | ~50 | `snapTree` (L111–145) |\n| `recovery.ts` | ~500 | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks`, `recoverFailedTasks`, `collectCheckpointsRecursive` (L146–505) |\n| `dirty-session.ts` | ~120 | `DIRTY_SESSION_STATUSES`, `formatAge`, `getLastSessionMetadata`, `guardDirtySession` (L506–599) |\n| `run-loop.ts` | ~350 | `autonomousRun` main body (L600–1180) |\n| `index.ts` | barrel | re-export public API |\n\n**Rules:**\n- No behavior change.\n- `run-loop.ts` imports from siblings; no circular imports.\n- Public path `@converge/core → orchestrator/autonomous` continues to export the same symbols.\n\n**Acceptance:**\n- Every file ≤500 lines\n- PR1 recovery + dirty-session suites green\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\005-split-autonomous"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR5 — Split src/orchestrator/autonomous.ts into 5 files + barrel

**Tier:** A

**Summary:** Decompose the 1180-line autonomous-run.ts into focused modules.

## Full specification

Split `packages/core/src/orchestrator/autonomous.ts` into:

| New file | Lines | Source range |
| --- | --- | --- |
| `types.ts` | ~80 | `AutonomousRunConfig`, `AutonomousRunResult`, `TreeSnap` |
| `snap.ts` | ~50 | `snapTree` (L111–145) |
| `recovery.ts` | ~500 | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks`, `recoverFailedTasks`, `collectCheckpointsRecursive` (L146–505) |
| `dirty-session.ts` | ~120 | `DIRTY_SESSION_STATUSES`, `formatAge`, `getLastSessionMetadata`, `guardDirtySession` (L506–599) |
| `run-loop.ts` | ~350 | `autonomousRun` main body (L600–1180) |
| `index.ts` | barrel | re-export public API |

**Rules:**
- No behavior change.
- `run-loop.ts` imports from siblings; no circular imports.
- Public path `@converge/core → orchestrator/autonomous` continues to export the same symbols.

**Acceptance:**
- Every file ≤500 lines
- PR1 recovery + dirty-session suites green
- `pnpm typecheck` + `pnpm test` green

---

Runs the full pipeline: **analyze → implement → review → quality**.
