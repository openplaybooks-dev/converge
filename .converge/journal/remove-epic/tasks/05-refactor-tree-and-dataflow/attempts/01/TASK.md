# Task: 05-refactor-tree-and-dataflow

Update the tree system to use playbookId instead of epicId.

**`packages/core/src/tree/tree-node.ts`:**
- Rename `get epicId()` → `get playbookId()`
- In `isComplete()`: change qualified ID from `${this.epicId}/${this.id}` to `${this.playbookId}/${this.id}`
- In `isFailed()`: same change

**`packages/core/src/tree/task-tree.ts`:**
- Replace all `epicId` references with `playbookId`
- Remove epic-specific grouping in task discovery
- Update `getProgress()` byEpic map → byPlaybook

**`packages/core/src/tree/journal-tree.ts`:**
- Remove epic filtering, replace with playbook filtering

**`packages/core/src/cli/next-task.ts`:**
- Rename `epicId` → `playbookId` in TaskNode interface
- Update treeNodesToTaskNodes(), buildTaskTree(), getTaskStates(), calculateExecutionPlan()

**`packages/core/src/journal/deps-map.ts`:**
- Replace epic task dependency grouping with playbook-based grouping