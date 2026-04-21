---
id: 012-extract-scheduler-pkg
title: "PR12 — Extract @converge/scheduler workspace package"
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 012-extract-scheduler-pkg
  title: "PR12 — Extract @converge/scheduler workspace package"
  tier: B
  task: "Move tree/next-task/* + ensure-epic-checkpoints into a scheduler package."
  spec: "Create `packages/scheduler/` workspace package.\n\n**Source:**\n- `packages/core/src/tree/next-task/*` (post-PR3 location)\n- `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` (moved here per PR11 resolution)\n- subset of `packages/core/src/tree/` that `next-task` depends on\n\n**Deps:** `@converge/journal` (workspace:*)\n\n**Exports:**\n- `findNextTask`, `buildTaskTree`, `getTaskStates`, `calculateExecutionPlan`\n- All types (`TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult`)\n- `ensureEpicCheckpoints`\n\n**Core side:** imports `@converge/scheduler` wherever `tree/next-task` was used.\n\n**Acceptance:**\n- `pnpm -r build` + `pnpm -r test` green\n- PR1 behavior-locking suites still pass (imports re-resolve to `@converge/scheduler`)\n- Scheduler tests pass in isolation"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\012-extract-scheduler-pkg"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR12 — Extract @converge/scheduler workspace package

**Tier:** B

**Summary:** Move tree/next-task/* + ensure-epic-checkpoints into a scheduler package.

## Full specification

Create `packages/scheduler/` workspace package.

**Source:**
- `packages/core/src/tree/next-task/*` (post-PR3 location)
- `packages/core/src/checkpoint/ensure-epic-checkpoints.ts` (moved here per PR11 resolution)
- subset of `packages/core/src/tree/` that `next-task` depends on

**Deps:** `@converge/journal` (workspace:*)

**Exports:**
- `findNextTask`, `buildTaskTree`, `getTaskStates`, `calculateExecutionPlan`
- All types (`TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult`)
- `ensureEpicCheckpoints`

**Core side:** imports `@converge/scheduler` wherever `tree/next-task` was used.

**Acceptance:**
- `pnpm -r build` + `pnpm -r test` green
- PR1 behavior-locking suites still pass (imports re-resolve to `@converge/scheduler`)
- Scheduler tests pass in isolation

---

Runs the full pipeline: **analyze → implement → review → quality**.
