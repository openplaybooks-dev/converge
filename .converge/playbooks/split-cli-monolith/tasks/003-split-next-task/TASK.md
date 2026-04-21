---
id: 003-split-next-task
title: PR3 — Split src/tree/next-task.ts into 5 files + barrel
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 003-split-next-task
  title: PR3 — Split src/tree/next-task.ts into 5 files + barrel
  tier: A
  task: Decompose the 1449-line next-task.ts into focused modules under src/tree/next-task/.
  spec: "Split `packages/core/src/tree/next-task.ts` into:\n\n| New file | Lines | Source range (original cli/next-task.ts) |\n| --- | --- | --- |\n| `types.ts` | ~80 | `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult` |\n| `build-tree.ts` | ~450 | `treeNodesToTaskNodes` + `buildTaskTree` (L95–297) |\n| `task-states.ts` | ~700 | `getCompletedTaskIds` + `getTaskStates` (L338–1325) |\n| `execution-plan.ts` | ~80 | `calculateExecutionPlan` (L1345–1396) |\n| `find-next.ts` | ~50 | `findNextTask` (L1418–1449) |\n| `index.ts` | barrel | re-export public API |\n\n**Rules:**\n- No behavior change. Pure file partitioning.\n- Each file must import what it needs from siblings; no circular imports.\n- Public API (what `findNextTask`, `buildTaskTree`, `getTaskStates` callers import) goes through `index.ts`.\n- Update the 10 consumer imports from PR2 to use the barrel (`../tree/next-task` stays the same path).\n\n**Acceptance:**\n- Every split file ≤500 lines\n- `pnpm typecheck` + `pnpm test` green\n- PR1 behavior-locking suites still pass (they were written against symbols, not line numbers — verify they resolve via the barrel)"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\003-split-next-task"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR3 — Split src/tree/next-task.ts into 5 files + barrel

**Tier:** A

**Summary:** Decompose the 1449-line next-task.ts into focused modules under src/tree/next-task/.

## Full specification

Split `packages/core/src/tree/next-task.ts` into:

| New file | Lines | Source range (original cli/next-task.ts) |
| --- | --- | --- |
| `types.ts` | ~80 | `TaskNode`, `WbsProgress`, `TaskStates`, `ExecutionSpan`, `NextTaskResult` |
| `build-tree.ts` | ~450 | `treeNodesToTaskNodes` + `buildTaskTree` (L95–297) |
| `task-states.ts` | ~700 | `getCompletedTaskIds` + `getTaskStates` (L338–1325) |
| `execution-plan.ts` | ~80 | `calculateExecutionPlan` (L1345–1396) |
| `find-next.ts` | ~50 | `findNextTask` (L1418–1449) |
| `index.ts` | barrel | re-export public API |

**Rules:**
- No behavior change. Pure file partitioning.
- Each file must import what it needs from siblings; no circular imports.
- Public API (what `findNextTask`, `buildTaskTree`, `getTaskStates` callers import) goes through `index.ts`.
- Update the 10 consumer imports from PR2 to use the barrel (`../tree/next-task` stays the same path).

**Acceptance:**
- Every split file ≤500 lines
- `pnpm typecheck` + `pnpm test` green
- PR1 behavior-locking suites still pass (they were written against symbols, not line numbers — verify they resolve via the barrel)

---

Runs the full pipeline: **analyze → implement → review → quality**.
