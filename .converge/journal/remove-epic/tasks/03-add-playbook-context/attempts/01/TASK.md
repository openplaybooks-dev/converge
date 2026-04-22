# Task: 03-add-playbook-context

Add PlaybookContext and wire it into the context hierarchy. **Note: EpicContext was already removed in Task 1.**

**`packages/core/src/context/types.ts`:**
- Add PlaybookContext interface:
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
- TaskContext: replace `readonly epic: Readonly<EpicContext>` with `readonly playbook: Readonly<PlaybookContext>`
- ExecutionStackLevel.type: replace `"epic" | "task" | "subtask"` with `"playbook" | "task" | "subtask"`

**`packages/core/src/tree/types.ts`:**
- TreeNodeData: replace `epicId` with `playbookId: string | undefined`

**`packages/core/src/context/index.ts`:**
- Export PlaybookContext
- Remove EpicContext exports (already cleaned in task 01)

Update `packages/core/src/functions/types.ts` to use PlaybookContext in PlanFn/CheckFn/EvalFn signatures.