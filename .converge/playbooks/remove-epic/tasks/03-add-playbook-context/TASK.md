---
id: 03-add-playbook-context
title: Add PlaybookContext to replace EpicContext
blocking: true
dependencies: [02-remove-epic-types]
---

Create PlaybookContext as the replacement for EpicContext in the context hierarchy.

**`packages/core/src/context/types.ts`:**
- Delete the EpicContext interface (lines ~95-125)
- Add PlaybookContext interface in its place:
  ```typescript
  export interface PlaybookContext extends BaseContext {
    readonly level: "playbook";
    readonly playbookId: string;
    readonly project: Readonly<ProjectContext>;
    readonly executionStack?: ReadonlyArray<ExecutionStackLevel>;
    readonly eval: EvalAPI;
    readonly plan: PlanAPI;
    readonly check: CheckAPI;
    readonly journal: JournalAPI;
  }
  ```
- Change TaskContext: replace `readonly epic: Readonly<EpicContext>` with `readonly playbook: Readonly<PlaybookContext>`
- Change ExecutionStackLevel.type from `"epic" | "task" | "subtask"` to `"playbook" | "task" | "subtask"`
- Remove EpicConfig, EpicStatus imports

**`packages/core/src/tree/types.ts`:**
- Add `playbookId: string | undefined` to TreeNodeData (replacing the epicId removed in task 02)

**`packages/core/src/context/index.ts`:**
- Export PlaybookContext
- Remove any remaining EpicContext references

Update `packages/core/src/functions/types.ts` to use PlaybookContext (replacing the placeholder from task 02).
