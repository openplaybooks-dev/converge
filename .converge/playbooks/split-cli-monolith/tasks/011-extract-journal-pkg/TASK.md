---
id: 011-extract-journal-pkg
title: "PR11 — Extract @converge/journal workspace package"
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 011-extract-journal-pkg
  title: "PR11 — Extract @converge/journal workspace package"
  tier: B
  task: "Move journal, checkpoint, storage into their own package. High import churn (~40 sites)."
  spec: "Create `packages/journal/` workspace package.\n\n**Source:** `packages/core/src/{journal,checkpoint,storage}/*`\n\n**Deps:** `zod` only.\n\n**Exports:**\n- `CheckpointManager`, `TaskCheckpointManager`, `UnitCheckpointManager`\n- `SessionLogger`\n- `FilesystemStorage`\n- `constructJournalPath`\n- `JournalCleanup`\n\n**Caveat — ensure-epic-checkpoints.ts:**\n`packages/core/src/checkpoint/ensure-epic-checkpoints.ts` imports `TaskNode` which (post-PR3) lives in `tree/next-task/`. This creates a cycle if we naively move it into journal.\n\n**Resolution:** move `ensure-epic-checkpoints.ts` into `@converge/scheduler` (PR12), not `@converge/journal`. It's a scheduler concern, not a journal concern.\n\n**High-churn:** ~40 import sites in core will change. Use a codemod or careful grep-driven edit.\n\n**Acceptance:**\n- `pnpm -r build` + `pnpm -r test` green\n- swebench + tbench tests re-run green\n- `@converge/journal` tests pass in isolation"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\011-extract-journal-pkg"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR11 — Extract @converge/journal workspace package

**Tier:** B

**Summary:** Move journal, checkpoint, storage into their own package. High import churn (~40 sites).

## Full specification

Create `packages/journal/` workspace package.

**Source:** `packages/core/src/{journal,checkpoint,storage}/*`

**Deps:** `zod` only.

**Exports:**
- `CheckpointManager`, `TaskCheckpointManager`, `UnitCheckpointManager`
- `SessionLogger`
- `FilesystemStorage`
- `constructJournalPath`
- `JournalCleanup`

**Caveat — ensure-epic-checkpoints.ts:**
`packages/core/src/checkpoint/ensure-epic-checkpoints.ts` imports `TaskNode` which (post-PR3) lives in `tree/next-task/`. This creates a cycle if we naively move it into journal.

**Resolution:** move `ensure-epic-checkpoints.ts` into `@converge/scheduler` (PR12), not `@converge/journal`. It's a scheduler concern, not a journal concern.

**High-churn:** ~40 import sites in core will change. Use a codemod or careful grep-driven edit.

**Acceptance:**
- `pnpm -r build` + `pnpm -r test` green
- swebench + tbench tests re-run green
- `@converge/journal` tests pass in isolation

---

Runs the full pipeline: **analyze → implement → review → quality**.
