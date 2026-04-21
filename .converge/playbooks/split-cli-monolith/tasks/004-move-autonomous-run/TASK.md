---
id: 004-move-autonomous-run
title: PR4 — Move cli/autonomous-run.ts to src/orchestrator/autonomous.ts
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 004-move-autonomous-run
  title: PR4 — Move cli/autonomous-run.ts to src/orchestrator/autonomous.ts
  tier: A
  task: Single-file move. Hard-break on root src/index.ts public export path.
  spec: "Move `packages/core/src/cli/autonomous-run.ts` → `packages/core/src/orchestrator/autonomous.ts`. No content split.\n\n**Import sites to update (4):**\n- `packages/core/src/cli/commands-run.ts`\n- `packages/core/src/converge/converge-runner.ts`\n- `packages/core/src/evolve/evolve-runner.ts`\n- `packages/core/src/index.ts` ← **public export path changes — no shim, hard break**\n\n**Post-move (this PR):** add an ESLint rule `no-restricted-imports` banning `../cli/*` from `tree/`, `orchestrator/`, `checkpoint/`, `journal/` to prevent future regressions.\n\n**Acceptance:**\n- `pnpm typecheck` + `pnpm test` green\n- swebench + tbench (which depend on @converge/core) re-run green — proves public surface is intact at the new path\n- Downstream of `@converge/core` that used `import { autonomousRun } from '@converge/core'` still works (root index re-export path updated, symbol name unchanged)"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\004-move-autonomous-run"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR4 — Move cli/autonomous-run.ts to src/orchestrator/autonomous.ts

**Tier:** A

**Summary:** Single-file move. Hard-break on root src/index.ts public export path.

## Full specification

Move `packages/core/src/cli/autonomous-run.ts` → `packages/core/src/orchestrator/autonomous.ts`. No content split.

**Import sites to update (4):**
- `packages/core/src/cli/commands-run.ts`
- `packages/core/src/converge/converge-runner.ts`
- `packages/core/src/evolve/evolve-runner.ts`
- `packages/core/src/index.ts` ← **public export path changes — no shim, hard break**

**Post-move (this PR):** add an ESLint rule `no-restricted-imports` banning `../cli/*` from `tree/`, `orchestrator/`, `checkpoint/`, `journal/` to prevent future regressions.

**Acceptance:**
- `pnpm typecheck` + `pnpm test` green
- swebench + tbench (which depend on @converge/core) re-run green — proves public surface is intact at the new path
- Downstream of `@converge/core` that used `import { autonomousRun } from '@converge/core'` still works (root index re-export path updated, symbol name unchanged)

---

Runs the full pipeline: **analyze → implement → review → quality**.
