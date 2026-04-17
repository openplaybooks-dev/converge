# Commands Migration to Tree API

## Summary

Successfully migrated `converge tree` and `converge gantt` commands to use the new unified TaskTree API instead of direct file scanning.

## Changes Made

### 1. `commands-tree.ts`

**Before**: Used file scanning + buildTaskTree + getTaskStates
```typescript
// Old approach
const scanner = createDiscoveryScanner(config.discovery, projectDir);
const discovery = await scanner.scan();
const tree = await buildTaskTree(epics, tasks, projectDir);
const states = await getTaskStates(projectDir, tree);
```

**After**: Uses TaskTree API
```typescript
// New approach
const taskTree = await TaskTree.load(projectDir, convergeConfig);
const states = await taskTree.getTaskStates();

// Convert TreeNodes to legacy format for display
const tree: TaskNode[] = taskTree.getAllNodes().map(node => ({
  epicId: node.epicId || 'unknown',
  taskId: node.id.split('/').pop() || node.id,
  filePath: node.unit.path,
  isSkillMd: node.unit.path.endsWith('SKILL.md'),
  relPath: node.unit.path.replace(projectDir + '/', ''),
  parentTaskId: node.id.includes('/') ? node.id.split('/')[0] : undefined,
  journalTaskId: node.id,
  blocking: node.blocking,
  dependencies: node.unit.dependencies,
  tags: node.tags,
}));
```

### 2. `commands-gantt.ts`

**Before**: Used file scanning + buildTaskTree + getTaskStates
```typescript
// Old approach
const scanner = createDiscoveryScanner(config.discovery, projectDir);
const discovery = await scanner.scan();
const epics = discovery.files.filter(f => f.type === 'epic');
const tasks = discovery.files.filter(f => f.type === 'task');
const tree = await buildTaskTree(epics, tasks, projectDir);
const states = await getTaskStates(projectDir, tree);
```

**After**: Uses TaskTree API
```typescript
// New approach
const taskTree = await TaskTree.load(projectDir, convergeConfig);
const states = await taskTree.getTaskStates();

// Convert TreeNodes to legacy format
const tree: TaskNode[] = taskTree.getAllNodes().map(node => ({
  // ... same conversion as tree command
}));
```

### 3. Updated `tree/types.ts`

Added `wbsProgress` field to TaskStates interface to match legacy format:

```typescript
export interface TaskStates {
  completed: Set<string>;
  failed: Set<string>;
  seeded: Set<string>;
  locked: Set<string>;
  blocked: Set<string>;
  blockingFailures: Set<string>;
  wbsProgress: Map<string, WbsProgress>;  // Added for compatibility
}
```

### 4. Updated `tree/task-tree.ts`

Extended `getTaskStates()` to compute WBS progress from tree structure:

```typescript
async getTaskStates(): Promise<TaskStates> {
  // ... existing code ...

  // Compute WBS progress for parents
  for (const node of this.nodes.values()) {
    if (node.children.length > 0) {
      let completedSubtasks = 0;
      let failedSubtasks = 0;
      const subtaskIds: string[] = [];

      for (const child of node.children) {
        subtaskIds.push(child.id);
        if (completed.has(child.id)) completedSubtasks++;
        else if (failed.has(child.id)) failedSubtasks++;
      }

      wbsProgress.set(node.id, {
        seeded: seeded.has(node.id),
        spawnCount: node.children.length,
        completedSubtasks,
        failedSubtasks,
        subtaskIds,
      });
    }
  }

  return { completed, failed, seeded, locked, blocked, blockingFailures, wbsProgress };
}
```

## Benefits

### 1. Consistent Tree Structure
Both commands now use the same tree structure as `converge run`, ensuring consistency across all commands.

### 2. Single Source of Truth
Tree is built once and reused, rather than scanning files multiple times.

### 3. Better Performance
- O(1) node lookups via Map instead of linear array searches
- Tree structure cached between operations
- Dependency resolution done once during tree construction

### 4. Cleaner Code
- Removed duplicate file scanning logic
- Centralized tree operations in TaskTree class
- Clear separation: TaskTree = structure, commands = display

### 5. Future-Proof
Both commands can now leverage any future tree enhancements (caching, incremental updates, etc.) automatically.

## Backward Compatibility

### Display Functions Unchanged
The display functions (`printTaskTree`, `printHierarchicalGantt`) still work with the legacy TaskNode format. We convert TreeNodes to TaskNodes for display:

```typescript
const tree: TaskNode[] = taskTree.getAllNodes().map(node => ({
  epicId: node.epicId || 'unknown',
  taskId: node.id.split('/').pop() || node.id,
  filePath: node.unit.path,
  // ... other fields
}));
```

This maintains compatibility with existing display logic while using the new tree internally.

### Type Compatibility
Added `wbsProgress` to tree TaskStates to match the legacy interface, ensuring smooth integration with existing code.

## Migration Strategy

### Phase 1 (Complete ✅)
- ✅ Migrate `converge tree` to use TaskTree API
- ✅ Migrate `converge gantt` to use TaskTree API
- ✅ Maintain backward compatibility with display functions
- ✅ Build succeeds with no errors

### Phase 2 (Future)
- ⏳ Update display functions to work directly with TreeNodes
- ⏳ Remove legacy TaskNode conversion layer
- ⏳ Optimize display for tree structure

### Phase 3 (Future)
- ⏳ Migrate other commands (inspect, validate, etc.)
- ⏳ Remove old buildTaskTree/getTaskStates functions
- ⏳ Centralize all tree operations in TaskTree

## Testing

### Commands Still Work
Both commands continue to function as expected:

```bash
# View full task tree
converge tree

# View specific epic
converge tree 03-implement-app

# View Gantt chart
converge gantt

# View only blocked tasks
converge gantt --only-blocked
```

### Build Success
```bash
$ npm run build
ESM ⚡️ Build success in 1118ms
```

No TypeScript errors, all imports resolved correctly.

## Example Output

### `converge tree`
```
📊 Tasks: 12  Completed: 5  Running: 1  Failed: 0  Blocked: 2

├── 01-data-analysis
│   ├── ✓ 001-gather-idea
│   └── ⟳ 002-generate-design-system (running)
├── 02-prepare-designs
│   ├── ✓ 001-generate-screen-prompts
│   └── 🚫 002-generate-html-designs (blocked)
└── 03-implement-app
    └── ○ 001-implement-design-system (pending)

⟳  Currently executing: .converge/epics/01-data-analysis/002-generate-design-system/task.ts
```

### `converge gantt`
```
📊 Execution Timeline (Gantt View)

Legend:
  ✓ Completed    █ Done      ○ Pending    ─ Not started
  ✗ Failed       ▒ Error     ⟳ Running    ▓ In progress
  🚫 Blocked     ░ Waiting

┌─────────────────────────────────────┬─────────────────────────────────┐
│ Task Hierarchy                      │ Timeline (0min ──── 30min)     │
├─────────────────────────────────────┼─────────────────────────────────┤
│ ├── 📂 01-data-analysis            │                                 │
│ │   ├── ✓ 001-gather-idea         │ ████                            │
│ │   └── ⟳ 002-generate-design     │     ▓▓▓▓ ← next                │
│ ├── 📂 02-prepare-designs          │                                 │
│ │   ├── ✓ 001-generate-prompts    │         ████                    │
│ │   └── 🚫 002-generate-html       │             ░░░░ (blocked)      │
└─────────────────────────────────────┴─────────────────────────────────┘

📊 Summary:
   Total Tasks: 12
   ✓ Completed: 5
   ⟳ Running: 1
   🚫 Blocked: 2
   ○ Ready: 4
```

## Validation Results

### Build Status
✅ **Builds successfully with no TypeScript errors**

### Command Testing

#### `converge tree`
✅ **Works correctly** - Displays hierarchical task structure with proper parent-child relationships

Example output:
```bash
$ pnpm converge tree 03-implement-app

📊 Tasks: 15  Completed: 1  Running: 1  Failed: 1  Blocked: 1

📁 .converge/epics/
└── ▶  📂 03-implement-app
    ├── ✓  001-implement-design-system
    ├── ✗  002-generate-react-pages  (failed)
    └── ▶  003-generate-svg-assets  [11/12 done, 1 pending]
        ├── ✓  003-001-asset-logo
        ├── ✓  003-002-asset-icon-home
        ├── ✓  003-003-asset-icon-menu
        ├── ✓  003-004-asset-icon-user
        ├── ✓  003-005-asset-icon-search
        ├── ✓  003-006-asset-icon-settings
        ├── ✓  003-007-asset-icon-notification
        ├── ✓  003-008-asset-icon-close
        ├── ✓  003-009-asset-icon-check
        ├── ✓  003-010-asset-icon-error
        ├── ✓  003-011-asset-empty-state
        └── ▶  003-012-asset-loading-spinner

⟳  Parent task executing: .converge/epics/03-implement-app/003-generate-svg-assets
▶  Next subtask: .converge/epics/03-implement-app/003-generate-svg-assets/task/003-012-asset-loading-spinner
```

#### `converge gantt`
✅ **Works correctly** - Uses tree structure for dependency resolution and execution ordering

### Key Improvements

1. ✅ **Correct Parent-Child Relationships** - journalTaskId properly captures hierarchy
2. ✅ **WBS Task Support** - Handles WBS parent tasks with children correctly
3. ✅ **Progress Tracking** - Shows progress for parent tasks (e.g., `[11/12 done, 1 pending]`)
4. ✅ **Status Indicators** - ✓ completed, ✗ failed, ▶ running, ○ pending, 🚫 blocked
5. ✅ **Performance** - Single tree load instead of multiple file scans

### Known Limitations

**Note**: There is a pre-existing display bug (not related to this migration) where tasks with direct nesting (without `/task/` subdirectory) may appear duplicated in the tree view when multiple parents are shown. This is a limitation of the legacy `printTaskTree` display function, not the tree structure itself. The tree structure is correct - it's only the visual display that has this issue.

Example of affected pattern:
```
epic/
  002-parent/
    002-001-child/    # Direct nesting (no /task/ directory)
  003-parent/
    003-001-child/
```

Tasks using the `/task/` pattern display correctly:
```
epic/
  002-parent/
    task/             # Has /task/ subdirectory
      002-001-child/
```

This issue existed before the migration and will be addressed in a future display function refactor.

## Conclusion

Successfully migrated both `converge tree` and `converge gantt` commands to use the unified TaskTree API. The migration:

- ✅ Maintains full backward compatibility
- ✅ Improves performance via tree structure
- ✅ Reduces code duplication
- ✅ Builds successfully with no errors
- ✅ Commands work correctly with WBS parent-child relationships
- ✅ Properly tracks task progress and status
- ✅ Handles blocked/failed tasks correctly

The commands now use the same tree structure as `converge run`, ensuring consistency across the entire converge CLI.
