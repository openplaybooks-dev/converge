# Task: 02-remove-epic-types

Remove all epic-related types, then add their playbook replacements.

**`packages/core/src/storage/types.ts`:**
- Delete EpicConfigSchema + EpicConfig type
- Delete EpicStatusSchema + EpicStatus type
- Delete EpicDepsSchema + EpicDeps type
- Add PlaybookConfigSchema + PlaybookConfig (same shape, rename)
- Add PlaybookStatusSchema + PlaybookStatus (same shape, rename)
- Add PlaybookDepsSchema + PlaybookDeps (same shape, rename)
- Remove `epics: z.array(z.string())` from ProjectConfigSchema
- Remove all epic methods from StoragePaths interface (epicConfig, epicStatus, epicDeps, epicLog, epicTasks)
- Add playbook equivalents: playbookConfig, playbookStatus, playbookDeps, playbookLog, playbookTasks
- Change taskConfig/taskStatus/taskLog signatures from `(epicId: string, taskId: string)` to `(playbookId: string, taskId: string)`
- Change GapSchema.level from `["project", "epic", "task"]` to `["project", "task"]`
- Change ExecutionLevelSchema.type from `["epic", "task", "subtask"]` to `["playbook", "task", "subtask"]`
- Remove `"epic"` from ProvenanceRecordSchema.entityType
- Remove legacy checkpoint fields: state.currentEpic, completed.epics
- Remove epic path implementations from createStoragePaths()
- Remove `epics` property from returned paths object, add `playbooks`

**`packages/core/src/journal/types.ts`:**
- Delete EpicStatus interface
- Add PlaybookStatus interface (rename, same shape: playbookId, status, startedAt, completedAt, totalTasks, completedTasks, failedTasks)

**`packages/core/src/functions/types.ts`:**
- Delete EpicDefinition interface
- Delete EpicBuilder interface
- Add PlaybookDefinition interface (same shape)
- Add PlaybookBuilder interface (same shape)
- Remove `epics: EpicDefinition[]` from ProjectDefinition, add `playbooks: PlaybookDefinition[]`
- Remove `epic()` from ProjectBuilder interface, add `playbook()`
- Replace EpicContext with PlaybookContext in PlanFn/CheckFn/EvalFn signatures
- Remove "current-epic", "next-epic", "new-epic" from YieldsDeclarative.target

**`packages/core/src/config/task-definition.ts`:**
- Delete EpicDefinition interface (extends TaskDefinition)
- Add PlaybookDefinition interface (extends TaskDefinition)

**`packages/core/src/tree/types.ts`:**
- Remove `epicId: string | undefined` from TreeNodeData (replaced with playbookId in task 03)

**`packages/core/src/runtime/task-manager.ts`:**
- Remove EpicDefinition references, add PlaybookDefinition