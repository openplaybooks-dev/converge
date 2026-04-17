# Enhanced Checkpoint System: Tree Traversal Cursor

## Overview

The enhanced checkpoint system implements hierarchical position tracking for task execution, enabling precise resume at any depth in the task tree (Epic → Task → Subtask → ...).

## Key Concepts

### Mental Model

**"Checkpoint records the cursor on tree traversal, where the tree is dynamic and changes over time but has the same root"**

- **Tree Structure**: Project → Epic → Task → Subtask → ... (arbitrary depth)
- **Cursor**: Current position in depth-first traversal
- **Dynamic**: Tasks can be added/removed between checkpoints
- **Same Root**: Project structure remains the anchor point

### Cursor Structure

```typescript
interface Cursor {
  path: string[];              // ["epic-01", "task-003", "subtask-002"]
  breadcrumbs: ExecutionLevel[]; // Full metadata for reconciliation
  depth: number;                 // Current nesting depth
}

interface ExecutionLevel {
  id: string;
  type: 'epic' | 'task' | 'subtask';
  filePath: string;
  depth: number;
}
```

## Implementation

### Phase 1: Schema & Types ✅

**Files Modified:**
- `src/storage/types.ts` - Added v2 checkpoint schema with cursor, completionTree, treeSnapshot
- `src/context/types.ts` - Added executionStack to TaskContext and EpicContext

**New Types:**
- `ExecutionLevel` - Single level in execution stack
- `Cursor` - Hierarchical position in tree
- `CompletionNode` - Node in completion tree
- `CompletionTree` - Hierarchical completion tracking
- `TreeSnapshot` - Structure hash for change detection

### Phase 2: Cursor Building ✅

**Files Created:**
- `src/checkpoint/tree-utils.ts` - Tree discovery, hashing, and path analysis utilities
- `src/checkpoint/migration.ts` - V1→V2 checkpoint migration
- `src/checkpoint/resumability.ts` - Resume with cursor reconciliation
- `src/checkpoint/index.ts` - Module exports

**Files Modified:**
- `src/orchestrator/convergence.ts` - Enhanced createCheckpoint() to build cursor
- `src/cli/commands-run.ts` - Added buildExecutionStack() helper

**Key Functions:**
- `buildCursorFromContext()` - Build cursor from execution stack
- `buildCompletionTree()` - Create hierarchical completion tree
- `snapshotTaskTree()` - Snapshot tree structure with hash
- `hashTaskTree()` - Generate deterministic structure hash
- `discoverTaskHierarchy()` - Discover all tasks in epic

### Phase 3: Resume Logic ✅

**File:** `src/checkpoint/resumability.ts`

**Resume Strategies:**
1. **exact-restore** - Tree unchanged → restore cursor exactly
2. **reconciled** - Tree changed but all nodes exist → validate and restore
3. **parent-fallback** - Current node deleted → resume at parent level
4. **restart** - Epic deleted or major structure change → restart from beginning
5. **legacy** - V1 checkpoint → migrate and use inferred cursor

**Reconciliation Flow:**
```
resumeFromCheckpoint()
  ↓
Check if v1 → migrate
  ↓
Re-discover current tree
  ↓
Compare hashes
  ├─ Same → exact-restore
  └─ Different → reconcileCursor()
       ↓
     Walk breadcrumbs, validate each level
       ├─ All exist → reconciled
       ├─ Node missing → parent-fallback
       └─ Epic gone → restart
```

### Phase 4: Migration ✅

**File:** `src/checkpoint/migration.ts`

**V1→V2 Migration:**
- Detects checkpoint version from `version` field
- Infers cursor from `currentEpic` and `currentTask` fields
- Builds minimal completion tree from flat `completed` arrays
- Creates empty tree snapshot (forces reconciliation on resume)

**Validation:**
- Checks cursor path/breadcrumbs consistency
- Validates depth calculation
- Returns detailed error messages

### Phase 5: Testing ✅

**File:** `tests/unit/checkpoint/checkpoint-cursor.test.ts`

**Test Coverage:**
- Tree hashing (deterministic, order-independent)
- Task ID extraction from paths
- Depth calculation
- V1→V2 migration
- Resume point description
- Helper functions

## Usage

### Creating Checkpoint with Cursor

```typescript
// During task execution, build execution stack
const executionStack = buildExecutionStack(task, epicPath, epicId);

// Pass to task context
const ctx = createTaskContext({
  ...baseContext,
  executionStack,
});

// Checkpoint automatically includes cursor
await createCheckpoint(ctx, iteration, gaps, convergenceState);
```

### Resume from Checkpoint

```typescript
// Load checkpoint
const checkpoint = storage.loadCheckpoint(checkpointId);

// Resume with reconciliation
const resumePoint = await resumeFromCheckpoint(checkpoint, convergeDir);

// Log resume strategy
console.log(describeResumePoint(resumePoint));

// Resume execution at cursor position
if (resumePoint.cursor) {
  const [epicId, taskId, subtaskId] = resumePoint.cursor.path;
  // Resume at this position
}
```

## File Structure

```
src/
├── checkpoint/
│   ├── index.ts           # Module exports
│   ├── tree-utils.ts      # Tree discovery & hashing
│   ├── migration.ts       # V1→V2 migration
│   └── resumability.ts    # Resume with reconciliation
├── storage/
│   └── types.ts           # Enhanced checkpoint schema
├── context/
│   └── types.ts           # Execution stack in contexts
├── orchestrator/
│   └── convergence.ts     # Cursor building in createCheckpoint()
└── cli/
    └── commands-run.ts    # buildExecutionStack() helper

tests/
└── unit/
    └── checkpoint/
        └── checkpoint-cursor.test.ts  # Test suite
```

## Benefits

✅ **Precise Resume**: Resume at exact subtask, not just top-level task
✅ **Dynamic Tree**: Handles tasks added/removed between checkpoints
✅ **Graceful Degradation**: Falls back to parent/restart when needed
✅ **Backward Compatible**: V1 checkpoints still work (migrated on load)
✅ **Human Readable**: YAML checkpoint format with clear structure
✅ **Change Detection**: Tree hash detects structure changes

## Trade-offs

⚠️ **Checkpoint Size**: ~2-3 KB vs ~500 bytes (v1)
⚠️ **Snapshot Cost**: ~50-100ms to discover and hash tree
⚠️ **Complexity**: More complex reconciliation logic
⚠️ **Migration**: Requires v1→v2 migration path

## Example Checkpoint (V2)

```yaml
version: 2
id: checkpoint-epic-01-iteration-3
timestamp: '2024-01-15T10:30:00Z'
iteration: 3

state:
  currentEpic: '01-data-analysis'
  phase: execute

cursor:
  path:
    - '01-data-analysis'
    - '003-generate-all-screens'
    - '002-screen-invoice-detail'
  breadcrumbs:
    - id: '01-data-analysis'
      type: epic
      filePath: '.converge/epics/01-data-analysis/epic.ts'
      depth: 0
    - id: '003-generate-all-screens'
      type: task
      filePath: '.converge/epics/01-data-analysis/003-generate-all-screens/SKILL.md'
      depth: 1
    - id: '002-screen-invoice-detail'
      type: subtask
      filePath: '.converge/epics/01-data-analysis/003-generate-all-screens/tasks/002-screen-invoice-detail/SKILL.md'
      depth: 2
  depth: 2

completionTree:
  nodes:
    '01-data-analysis':
      id: '01-data-analysis'
      status: active
      childIds:
        - '001-analyze-data'
        - '002-generate-design-system'
        - '003-generate-all-screens'
    '001-analyze-data':
      id: '001-analyze-data'
      status: completed
      parentId: '01-data-analysis'
      completedAt: '2024-01-15T09:00:00Z'
      childIds: []
    '002-generate-design-system':
      id: '002-generate-design-system'
      status: completed
      parentId: '01-data-analysis'
      completedAt: '2024-01-15T10:00:00Z'
      childIds: []
    '003-generate-all-screens':
      id: '003-generate-all-screens'
      status: active
      parentId: '01-data-analysis'
      childIds:
        - '001-screen-dashboard'
        - '002-screen-invoice-detail'
        - '003-screen-history'
    '001-screen-dashboard':
      id: '001-screen-dashboard'
      status: completed
      parentId: '003-generate-all-screens'
      completedAt: '2024-01-15T10:20:00Z'
      childIds: []
    '002-screen-invoice-detail':
      id: '002-screen-invoice-detail'
      status: active
      parentId: '003-generate-all-screens'
      childIds: []

treeSnapshot:
  structureHash: 'a7f3e9c2'
  taskPaths:
    - '.converge/epics/01-data-analysis/001-analyze-data/SKILL.md'
    - '.converge/epics/01-data-analysis/002-generate-design-system/SKILL.md'
    - '.converge/epics/01-data-analysis/003-generate-all-screens/SKILL.md'
    - '.converge/epics/01-data-analysis/003-generate-all-screens/tasks/001-screen-dashboard/SKILL.md'
    - '.converge/epics/01-data-analysis/003-generate-all-screens/tasks/002-screen-invoice-detail/SKILL.md'
    - '.converge/epics/01-data-analysis/003-generate-all-screens/tasks/003-screen-history/SKILL.md'

gaps: []
completed:
  epics: []
  tasks:
    - '001-analyze-data'
    - '002-generate-design-system'
    - '001-screen-dashboard'

metadata:
  created: '2024-01-15T10:30:00Z'
  machine: 'dev-machine-1'
```

## Next Steps

1. **Integration Testing**: Test with real task hierarchies
2. **Performance Benchmarking**: Measure snapshot and reconciliation overhead
3. **CLI Integration**: Add `converge resume` command
4. **Resume UI**: Display resume strategy in CLI output
5. **Telemetry**: Track resume strategy usage for analytics

## References

- Plan: `/Users/minh/Documents/sheetsrun/CHECKPOINT_CURSOR_PLAN.md`
- Storage Types: `src/storage/types.ts:290-430`
- Context Types: `src/context/types.ts:128-152`
- Convergence: `src/orchestrator/convergence.ts:578-609`
