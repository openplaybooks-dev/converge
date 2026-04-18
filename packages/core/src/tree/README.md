# Tree Module - Unified Task Traversal

## Overview

This module implements a proper tree data structure for task traversal by **wrapping Units in TreeNodes**. This unifies the Unit (execution) and Tree (structure) modules naturally.

## Unified Design: Unit + TreeNode

**Core Principle:** TreeNode wraps Unit and adds tree-specific functionality.

```
TreeNode {
  unit: Unit                    // The actual task (execution logic)
  children: TreeNode[]          // Tree structure
  dependencies: TreeNode[]      // Resolved dependency edges

  // Delegates to unit (no duplication)
  get id() → unit.id
  get parent() → unit.parent
  get blocking() → unit.blocking
}

Unit {
  id, title, inputs, outputs    // TaskDefinition
  parent: Unit                   // Single parent reference
  run() → convergence loop       // Execution logic
  context: TaskContext           // Path-based with parent chain
}
```

## Architecture

### Core Components

1. **Unit** (`unit/unit.ts`) - The Task Itself
   - Task definition (id, title, inputs, outputs, vars, tags)
   - Execution logic (run(), resolveChecks(), resolvePrompt())
   - Parent reference (parent: Unit - single upward link)
   - Context (TaskContext with path-based IDs and parent chain)
   - Convergence loop (while hasGaps { fixGaps })

2. **TreeNode** (`tree/tree-node.ts`) - Tree Wrapper
   - Wraps a Unit (readonly unit: Unit)
   - Tree structure (children: TreeNode[], dependencies, dependents)
   - Delegates properties (id, parent, blocking, tags → unit)
   - State queries (isComplete(), isFailed(), isBlocked())
   - Hierarchical traversal (findNextTask() at depth 1 only)

3. **TaskTree** (`tree/task-tree.ts`) - Tree Manager
   - Loads Units from filesystem
   - Wraps each Unit in a TreeNode
   - Builds tree edges (children, dependencies)
   - Fast O(1) lookup (nodes: Map<id, TreeNode>)
   - Checkpoint integration (shadow tree 1:1 with nodes)
   - Tree shake (reload() after WBS seeding)

4. **Types** (`tree/types.ts`)
   - `TreeNodeData`: Lightweight node data for API responses
   - `TaskStates`: Computed states (completed, failed, blocked)
   - `NextTaskResult`: Result from hierarchical traversal
   - `WbsProgress`: WBS parent progress tracking

## Key Design Principles

### 1. Tree is the Data Model

- Files are persistence only, not the data model
- All operations use tree traversal, not file scanning
- Nodes wrap Units (tasks) with edges for relationships

### 2. Hierarchical Traversal (Depth 1)

`findNextTask()` is **NOT** a deep recursive search. Each level returns its immediate child:

```
Root Tree
  ├─ Epic 1
  │   ├─ Task 001
  │   ├─ Task 002 (WBS parent)
  │   │   ├─ Subtask 001
  │   │   └─ Subtask 002
  │   └─ Task 003
  └─ Epic 2
      └─ Task 001

// Traversal flow (depth 1 at each level):
tree.findNextTask()      → returns Epic1 node (depth 1 from root)
epic1.findNextTask()     → returns Task002 node (depth 1 from epic)
task002.findNextTask()   → returns Subtask001 node (depth 1 from task)
subtask001.findNextTask() → returns null (leaf node, no children)
```

This touches the **full branch**: Root → Epic1 → Task002 → Subtask001, not just finding a leaf.

### 3. Checkpoint is Shadow Tree

- Checkpoint maintains 1:1 mapping with TreeNodes
- Internal only - consumers never access checkpoint directly
- All state queries go through TreeNode methods

### 4. Tree Shake on Every Iteration

```typescript
// Autonomous run loop
while (true) {
  const next = await tree.findNextTask();
  await executeTask(next);
  await tree.reload(); // Tree shake - rebuild from filesystem
}
```

Tree changes on every step:

- WBS seeding adds new nodes
- File-based task creation
- Tree is rebuilt to maintain consistency

## API

### Construction

```typescript
// Load tree (loads Units from filesystem, wraps in TreeNodes)
const tree = await TaskTree.load(projectDir, convergeConfig);

// Tree shake (reload Units after WBS seeding)
await tree.reload();
```

### Accessing Unit vs TreeNode

```typescript
// Get TreeNode (tree structure)
const treeNode = tree.getNode(taskId);

// Get Unit (execution logic)
const unit = treeNode.unit;

// Execute Unit
await unit.run();

// Query TreeNode state
const isBlocked = await treeNode.isBlocked();
const isComplete = await treeNode.isComplete();

// Access parent via Unit
const parentUnit = unit.parent;

// Access children via TreeNode
const childNodes = treeNode.children; // TreeNode[]
const childUnits = childNodes.map((n) => n.unit); // Unit[]
```

### Hierarchical Traversal

```typescript
// Get next epic (depth 1 from root)
const result = await tree.findNextTask();

// Get next task in epic (depth 1 from epic)
const epic = tree.getNode(result.node.id);
const task = await epic.findNextTask();

// Get next subtask (depth 1 from task)
const subtask = await task.findNextTask();
```

### State Queries

```typescript
// Node-level queries
const isComplete = await node.isComplete();
const isFailed = await node.isFailed();
const isBlocked = await node.isBlocked();
const isSeeded = node.isSeeded();

// Tree-level queries
const states = await tree.getTaskStates();
const blocked = await tree.getBlockedTasks();
const failures = await tree.getBlockingFailures();
const progress = await tree.getProgress();
```

### State Mutations

```typescript
// Mark task complete (propagates auto-completion)
await tree.markCompleted(node);

// Mark task failed (blocks dependents via traversal)
await tree.markFailed(node);

// Mark WBS parent seeded
await tree.markSeeded(node, childIds);
```

### Generic Traversal

```typescript
// Pre-order DFS
await tree.traverse((node) => {
  console.log(node.id);
}, "pre");

// Filter nodes
const blockedTasks = await tree.filter(async (n) => await n.isBlocked());
```

## Blocking Logic

Blocking is computed via tree traversal, not stored in files:

```typescript
async isBlocked(): boolean {
  // 1. Check dependency edges
  for (const dep of this.dependencies) {
    if (dep.blocking && await dep.isFailed()) return true;
    if (await dep.isBlocked()) return true;  // Transitive
  }

  // 2. Check parent edge
  if (this.parent && await this.parent.isBlocked()) return true;

  // 3. Check epic sequential order (sibling edges)
  if (this.parent) {
    const myIndex = this.parent.children.indexOf(this);
    for (let i = 0; i < myIndex; i++) {
      if (await this.parent.children[i].isFailed()) return true;
    }
  }

  return false;
}
```

## Migration Path

### Phase 1: Parallel Implementation (Current)

- Tree module exists alongside old code
- `autonomous-run.ts` uses TaskTree
- `next-task.ts` remains as legacy fallback

### Phase 2: Gradual Migration

- Update other consumers (repair strategies, etc.)
- Migrate from file scanning to tree queries

### Phase 3: Cleanup

- Remove old file-scanning code
- Remove `next-task.ts` or make it a thin wrapper

## Benefits

1. **Single Source of Truth**: Tree state in one place
2. **Testability**: Pure class, easy to unit test
3. **Performance**: O(1) lookups, cached execution order
4. **Maintainability**: Clear API, isolated blocking logic
5. **Debuggability**: Can serialize tree state at any time

## Testing

See `__tests__/task-tree.test.ts` for:

- Tree building from files
- Parent-child edges (WBS)
- Dependency edges (direct and tag-based)
- Hierarchical traversal
- Blocking via dependencies
- State propagation
- Tree reload

## Example: Before vs After

### BEFORE (Array Iteration)

```typescript
// Re-scan filesystem
const snap = await snapTree();
const tasks = snap.tasks;

// Linear search
const next = tasks.find(
  (t) =>
    !checkpoint.completedTasks.has(t.id) && !checkpoint.failedTasks.has(t.id),
);

// Direct checkpoint write
checkpoint.completedTasks.add(next.id);
await checkpoint.save();
```

### AFTER (Tree Traversal)

```typescript
// Load tree once
const tree = await TaskTree.load(projectDir, config);

// Hierarchical traversal (depth 1 chain)
const epic = await tree.findNextTask();
const task = await epic.findNextTask();
const subtask = await task?.findNextTask();

// Tree mutation with propagation
const node = tree.getNode(taskId);
await tree.markCompleted(node); // Auto-completes parent if all children done

// Tree shake
await tree.reload();
```

## Implementation Status

- ✅ TreeNode class with edges
- ✅ TaskTree with hierarchical traversal
- ✅ Checkpoint integration (shadow tree)
- ✅ Blocking logic via tree traversal
- ✅ State queries (complete, failed, blocked)
- ✅ State mutations (mark complete/failed)
- ✅ Tree reload (shake)
- ✅ Integration with autonomous-run.ts
- ⏳ Tests (placeholders created)
- ⏳ Migration of other consumers
- ⏳ Removal of legacy code
