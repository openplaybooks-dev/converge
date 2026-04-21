---
id: 002-move-next-task
title: PR2 — Move cli/next-task.ts to src/tree/next-task.ts
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 002-move-next-task
  title: PR2 — Move cli/next-task.ts to src/tree/next-task.ts
  tier: A
  task: Single-file move of cli/next-task.ts into src/tree/. No content split yet.
  spec: "Move `packages/core/src/cli/next-task.ts` → `packages/core/src/tree/next-task.ts` with zero content changes.\n\n**Import sites to update (10):**\n- `packages/core/src/cli/commands-*.ts` (6 files that import next-task)\n- `packages/core/src/cli/reconcile.ts`\n- `packages/core/src/cli/autonomous-run.ts`\n- `packages/core/src/cli/tree-display.ts`\n- `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` (non-CLI consumer)\n\nFind all consumers with:\n```bash\ngrep -rn \"from.*cli/next-task\" packages/core/src\n```\n\n**Acceptance:**\n- `pnpm --filter @converge/core build` clean\n- `pnpm --filter @converge/core test` green (PR1 suites still pass)\n- `git mv` used so history is preserved"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\002-move-next-task"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR2 — Move cli/next-task.ts to src/tree/next-task.ts

**Tier:** A

**Summary:** Single-file move of cli/next-task.ts into src/tree/. No content split yet.

## Full specification

Move `packages/core/src/cli/next-task.ts` → `packages/core/src/tree/next-task.ts` with zero content changes.

**Import sites to update (10):**
- `packages/core/src/cli/commands-*.ts` (6 files that import next-task)
- `packages/core/src/cli/reconcile.ts`
- `packages/core/src/cli/autonomous-run.ts`
- `packages/core/src/cli/tree-display.ts`
- `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` (non-CLI consumer)

Find all consumers with:
```bash
grep -rn "from.*cli/next-task" packages/core/src
```

**Acceptance:**
- `pnpm --filter @converge/core build` clean
- `pnpm --filter @converge/core test` green (PR1 suites still pass)
- `git mv` used so history is preserved

---

Runs the full pipeline: **analyze → implement → review → quality**.
