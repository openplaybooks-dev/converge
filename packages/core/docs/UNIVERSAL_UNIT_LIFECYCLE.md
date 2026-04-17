# Universal Unit Lifecycle

## Philosophy

**Every unit of work follows the same lifecycle**, regardless of whether it's a project, epic, task, or subtask. The folder structure is the source of truth for hierarchy.

## Unit Types

All units use the same `UnitCheckpoint` interface:

```typescript
interface UnitCheckpoint {
  type: 'project' | 'epic' | 'task';
  id: string;
  parentId?: string;
  currentAttempt?: number;        // For executable units
  status: 'pending' | 'running' | 'complete' | 'failed' | 'seeded';
  attempts?: AttemptRecord[];     // Execution history
  progress?: UnitProgress;        // Child tracking
  lastUpdated: string;
  createdAt: string;
}
```

### Project
- **Location**: `.converge/journal/project/checkpoint.json`
- **Purpose**: Top-level container tracking overall project progress
- **Children**: Epics
- **Executable**: No (aggregates epic progress only)

### Epic
- **Location**: `.converge/journal/epics/{epicId}/checkpoint.json`
- **Definition**: `.converge/epics/{epicId}/epic.ts` (uses `taskDef()`)
- **Purpose**: Grouping of related tasks, **executable unit**
- **Children**: Top-level tasks in the epic
- **Executable**: **Yes** - can have WBS, spawn tasks, run AI agents
- **Example**: `02-prepare-designs` epic spawns design tasks

### Task
- **Location**: `.converge/journal/epics/{epicId}/tasks/{taskId}/checkpoint.json`
- **Definition**: `.converge/epics/{epicId}/{taskId}/task.ts` or `SKILL.md`
- **Purpose**: Unit of work, **executable unit**
- **Children**: Subtasks (if WBS parent)
- **Executable**: **Yes** - runs AI agents, executes checks, spawns subtasks

### Subtask
- **Location**: `.converge/journal/epics/{epicId}/tasks/{parentId}/{childId}/checkpoint.json`
- **Definition**: `.converge/epics/{epicId}/{parentId}/{childId}/SKILL.md`
- **Purpose**: Child unit of work under a parent task
- **Children**: Can have its own children (recursive)
- **Executable**: **Yes** - same as regular tasks

## Folder Structure (Source of Truth)

### Task Hierarchy
```
.converge/
├── epics/
│   └── 02-prepare-designs/
│       ├── epic.ts                          # Epic definition (executable)
│       ├── 001-breakdown-ux-to-screens/
│       │   └── task.ts                       # Task
│       ├── 002-generate-screen-prompts/
│       │   ├── task.ts                       # Parent task (WBS)
│       │   ├── 002-001-prompt-home/
│       │   │   └── SKILL.md                  # Subtask
│       │   ├── 002-002-prompt-quiz/
│       │   │   └── SKILL.md                  # Subtask
│       │   └── 002-003-prompt-dashboard/
│       │       └── SKILL.md                  # Subtask
│       └── 003-generate-html-designs/
│           └── task.ts                       # Task
```

### Journal Structure (Mirroring Hierarchy)
```
.converge/journal/
├── project/
│   └── checkpoint.json                      # Project checkpoint
├── epics/
│   └── 02-prepare-designs/
│       ├── checkpoint.json                   # Epic checkpoint
│       └── tasks/
│           ├── 001-breakdown-ux-to-screens/
│           │   └── checkpoint.json           # Task checkpoint
│           ├── 002-generate-screen-prompts/
│           │   ├── checkpoint.json           # Parent task checkpoint
│           │   ├── 002-001-prompt-home/
│           │   │   └── checkpoint.json       # Subtask checkpoint
│           │   ├── 002-002-prompt-quiz/
│           │   │   └── checkpoint.json       # Subtask checkpoint
│           │   └── 002-003-prompt-dashboard/
│           │       └── checkpoint.json       # Subtask checkpoint
│           └── 003-generate-html-designs/
│               └── checkpoint.json           # Task checkpoint
```

## Lifecycle Phases

### 1. Discovery
- Scan `.converge/epics/` for `epic.ts` and `task.ts`/`SKILL.md` files
- Build hierarchy from folder structure (NOT from WBS metadata)
- Parent-child relationships determined by filesystem nesting

### 2. Execution
```typescript
// ALL units follow the same execution flow:
1. startAttempt(n)              // Create attempt record
2. Unit.run()                    // Execute (may spawn children via WBS)
3. completeAttempt(n, outcome)   // Record outcome
4. markComplete() or markSeeded() // Update status
```

### 3. Progress Tracking
```typescript
// For units with children:
progress: {
  totalChildren: number;         // From folder structure
  completedChildren: number;     // From checkpoint state
  failedChildren: number;        // From checkpoint state
  childIds: string[];            // Simple IDs
  lastProgressUpdate: string;
}
```

### 4. Auto-Completion
```typescript
// When all children done:
if (completedChildren + failedChildren === totalChildren) {
  if (failedChildren > 0) {
    unit.markFailed();
  } else {
    unit.markComplete();
  }
}
```

## Universal Checkpoint Manager

```typescript
// Works for ANY unit type:
const epic = new UnitCheckpointManager(projectDir, 'epic', 'epicId');
const task = new UnitCheckpointManager(projectDir, 'task', 'epicId', 'taskId');
const subtask = new UnitCheckpointManager(projectDir, 'task', 'epicId', 'parent/child');

// Same interface for all:
await unit.startAttempt(1);
await unit.markSeeded();
await unit.updateProgress(progress);
await unit.markComplete();
```

## Key Principles

1. **Folder Structure = Truth**: Hierarchy determined by filesystem, not metadata
2. **Universal Lifecycle**: Same execution flow for epics, tasks, subtasks
3. **Recursive Composition**: Any unit can have children, forming a tree
4. **Self-Contained Checkpoints**: Each unit has its own checkpoint.json
5. **Bottom-Up Completion**: Parents complete when all children complete
6. **WBS as Spawning**: Seeding is just a one-time spawn mechanism
7. **No Distinction**: Seeded vs manually-created children treated identically

## Examples

### Epic as Executable Unit
```typescript
// .converge/epics/02-prepare-designs/epic.ts
export default taskDef()
  .id('02-prepare-designs')
  .wbs(async (ctx) => {
    await ctx.spawn(
      taskDef()
        .id('001-breakdown-ux-to-screens')
        .skill('ux-breakdown')
        .build()
    );
  })
  .build();
```

### Task with Subtasks
```typescript
// .converge/epics/02-prepare-designs/002-generate-screen-prompts/task.ts
export default taskDef()
  .id('002-generate-screen-prompts')
  .wbs(async (ctx) => {
    for (const screen of screens) {
      await ctx.spawn(
        taskDef()
          .id(`002-${index}-prompt-${screen.id}`)
          .skill('stitch-prompt')
          .build()
      );
    }
  })
  .build();
```

Both use the same `taskDef()` API and lifecycle!

## Benefits

✅ **Consistent Interface**: Same API for all unit types
✅ **Recursive Composition**: Unlimited nesting depth
✅ **Self-Documenting**: Folder structure shows hierarchy
✅ **Flexible**: Epic can be simple container OR executable unit
✅ **Resumable**: Each unit tracks its own execution state
✅ **Bottom-Up**: Completion propagates naturally up the tree
