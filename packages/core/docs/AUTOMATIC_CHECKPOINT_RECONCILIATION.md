# Automatic Checkpoint Reconciliation

## Overview

The Converge framework now automatically detects and corrects inconsistencies between checkpoint state and filesystem reality, ensuring that the execution state always matches the actual project state.

## Reconciliation Phase

Every command starts with a reconciliation phase that:

1. **Scans filesystem** for all task definitions
2. **Loads checkpoint state** (completedTasks, failedTasks, seededTasks)
3. **Validates outputs** for tasks marked complete/failed
4. **Auto-corrects checkpoint** when inconsistencies detected
5. **Propagates state changes** up the task hierarchy

## Automatic Corrections

### 1. Uncomplete Tasks with Missing Outputs

**Detection**: Task marked `complete` but required output files missing

**Action**:
- Remove from `completedTasks` in checkpoint
- Remove from `lockedTasks` (allow re-run)
- Keep attempt count in `taskAttempts`
- Log warning with missing file paths

**Example**:
```
⚠️  Task 002-001-prompt-home-lesson-tree marked complete but missing outputs:
   - .stitch/prompts/home-lesson-tree.md
```

**Checkpoint Update**:
```typescript
// Before
completedTasks: ['002-001-prompt-home-lesson-tree', ...]
lockedTasks: ['002-001-prompt-home-lesson-tree', ...]

// After (automatic)
completedTasks: [...]  // task removed
lockedTasks: [...]     // task removed (can re-run)
```

### 2. Reconcile Failed Tasks with Present Outputs

**Detection**: Task marked `failed` but all required outputs exist

**Action**:
- Move from `failedTasks` to `completedTasks`
- Update checkpoint automatically
- Log reconciliation message

**Example**:
```
⚠️  Task 003-generate-html-designs marked failed but all outputs exist. Reconciling checkpoint...
```

### 3. Revert Parents When Children Change

**Detection**: Parent marked `complete`/`failed` but children not all done

**Action**:
- Revert parent from `completedTasks`/`failedTasks` to `seededTasks`
- Update checkpoint automatically
- Log reversion message

**Example**:
```
↻ Reverted parent to seeded: 002-generate-screen-prompts (0/3 children done)
```

**Use Case**: Child task outputs were deleted or validation failed

### 4. Auto-Complete Parents When All Children Done

**Detection**: All children completed or failed

**Action**:
- If any child failed → mark parent as `failed`
- If all children completed → mark parent as `completed`
- Remove from `seededTasks`
- Update checkpoint automatically

**Example**:
```
↻ Auto-completed parent: 002-generate-screen-prompts (3/3 children done)
```

## Implementation

### CheckpointManager Methods

**New Method**: `removeFromCompleted(taskId: string)`
```typescript
async removeFromCompleted(taskId: string): Promise<void> {
  // Remove from completedTasks
  // Remove from lockedTasks (allow re-run)
  // Save checkpoint
}
```

**Existing Methods** (used for automatic updates):
- `markTaskCompleted(taskId)` - Move to completed
- `markTaskFailed(taskId)` - Move to failed
- `markTaskSeeded(taskId)` - Move to seeded

### Reconciliation Flow

```typescript
// 1. Reconciliation phase (runs first)
const result = await reconcile(projectDir);
// - Scans filesystem
// - Validates outputs
// - Auto-corrects checkpoint
// - Returns corrected tree + states

// 2. Use corrected state
const { tree, states } = result;
// states.completed, states.failed, states.seeded are now accurate
```

### Integration Points

**commands-tree.ts**:
```typescript
export async function treeCommand(options: TreeCommandOptions = {}) {
  // Reconciliation phase runs first
  const reconciliationResult = await reconcile(projectDir, false);
  const tree = reconciliationResult.tree;
  const states = reconciliationResult.states;

  // Display tree with corrected state
  printTaskTree(tree, states, nextTaskId);
}
```

**next-task.ts** (inside `getTaskStates()`):
```typescript
// Phase 1: Load checkpoint state
// Phase 2: Validate outputs → auto-correct checkpoint
// Phase 3: Auto-complete/revert parents → auto-update checkpoint
// Phase 4: Return corrected states
```

## Benefits

### 1. Self-Healing
- System automatically recovers from state corruption
- No manual checkpoint editing needed
- Resilient to file deletions or moves

### 2. Always Correct
- Checkpoint state always matches filesystem reality
- No stale "completed" tasks with missing outputs
- Parents reflect actual child state

### 3. Transparent
- All corrections logged to console
- User sees exactly what was fixed
- Corrections summary after reconciliation

### 4. Idempotent
- Running command multiple times is safe
- Each run validates and corrects state
- Convergent to correct state

## Example Session

```bash
$ pnpm converge tree 002-generate-screen-prompts

🔄 Reconciling task state...
   Found 28 tasks across 5 epics
⚠️  Task 002-001-prompt-home-lesson-tree marked complete but missing outputs:
   - .stitch/prompts/home-lesson-tree.md
⚠️  Task 002-002-prompt-lesson-quiz marked complete but missing outputs:
   - .stitch/prompts/lesson-quiz.md
⚠️  Task 002-003-prompt-progress-dashboard marked complete but missing outputs:
   - .stitch/prompts/progress-dashboard.md
  ↻ Reverted parent to seeded: 002-generate-screen-prompts (0/3 children done)
   Corrections applied:
     Uncompleted (missing outputs): 4
       - 002-001-prompt-home-lesson-tree
       - 002-002-prompt-lesson-quiz
       - 002-003-prompt-progress-dashboard
       - 002-generate-screen-prompts
   ✓ Reconciliation complete

📊 Tasks: 4  Completed: 0  Failed: 0  Blocked: 3

📁 .converge/epics/
└── 📂 02-prepare-designs  ▶
    └── ◑  002-generate-screen-prompts 📌  (seeded)  [0/3 done, 3 pending]
        ├── ▶  002-001-prompt-home-lesson-tree 📌  ← next
        ├── ○  002-002-prompt-lesson-quiz 📌
        └── ○  002-003-prompt-progress-dashboard 📌

▶  Next: .converge/epics/02-prepare-designs/002-generate-screen-prompts/002-001-prompt-home-lesson-tree/SKILL.md
```

**Second run** (after corrections persisted):
```bash
$ pnpm converge tree 002-generate-screen-prompts

🔄 Reconciling task state...
   Found 28 tasks across 5 epics
   ✓ Reconciliation complete
   # No corrections needed - state is correct!

📊 Tasks: 4  Completed: 0  Failed: 0  Blocked: 3
# ... same tree output
```

## Future Enhancements

### Potential Additions

1. **Reconciliation on startup** of autonomous runs
2. **Periodic reconciliation** during long-running sessions
3. **Reconciliation metrics** (how many corrections per session)
4. **Reconciliation history** (log all corrections with timestamps)
5. **Manual reconcile command** (`converge reconcile --fix-all`)

### Consistency Guarantees

Currently implemented:
- ✅ Output validation
- ✅ Parent-child state consistency
- ✅ Automatic checkpoint updates
- ✅ Idempotent reconciliation

Future considerations:
- 🔄 Distributed locking for parallel runs
- 🔄 Transaction-based checkpoint updates
- 🔄 Checkpoint versioning and rollback
