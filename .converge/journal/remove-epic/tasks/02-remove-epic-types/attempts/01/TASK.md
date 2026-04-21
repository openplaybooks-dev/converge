# Task: 02-remove-epic-types

Remove all epic-related types, schemas, and interfaces from type definition files.

**`packages/core/src/storage/types.ts`:**
- Delete EpicConfigSchema + EpicConfig type (lines ~182-213)
- Delete EpicStatusSchema + EpicStatus type (lines ~219-234)
- Delete EpicDepsSchema + EpicDeps type (lines ~240-248)
- Remove `epics: z.array(z.string())` from ProjectConfigSchema (line ~155)
- Remove all epic methods from StoragePaths interface (epicConfig, epicStatus, epicDeps, epicLog, epicTasks)
- Change taskConfig/taskStatus/taskLog signatures from `(epicId: string, taskId: string)` to `(taskPath: string)`
- Change GapSchema.level from `["project", "epic", "task"]` to `["project", "task"]`
- Change ExecutionLevelSchema.type from `["epic", "task", "subtask"]` to `["task", "subtask"]`
- Remove `"epic"` from ProvenanceRecordSchema.entityType
- Remove legacy checkpoint fields: state.currentEpic, completed.epics
- Remove epic path implementations from createStoragePaths()
- Remove `epics` property from returned paths object

**`packages/core/src/runtime/types.ts`:**
- Delete EpicManager interface entirely
- Remove `epics: EpicManager` from Runtime interface

**`packages/core/src/functions/types.ts`:**
- Delete EpicDefinition interface
- Delete EpicBuilder interface
- Remove `epics: EpicDefinition[]` from ProjectDefinition
- Remove `epic()` from ProjectBuilder
- Replace EpicContext with PlaybookContext in PlanFn/CheckFn/EvalFn signatures (use placeholder — PlaybookContext created in next task)
- Remove "current-epic", "next-epic", "new-epic" from YieldsDeclarative.target

**`packages/core/src/tree/types.ts`:**
- Remove `epicId: string | undefined` from TreeNodeData (will be replaced with playbookId in task 03)