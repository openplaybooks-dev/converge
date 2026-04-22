# Unified Tree + Unit Design

## Core Principle

**A TreeNode IS a wrapper around a Unit that adds tree-specific functionality.**

- **Unit** = The task itself (execution, checks, convergence loop, parent reference)
- **TreeNode** = Tree traversal wrapper (children array, dependencies, blocking queries)

```
TreeNode {
  unit: Unit                    // The actual task
  children: TreeNode[]          // Tree structure (replaces Unit.children)
  dependencies: TreeNode[]      // Resolved dependency edges
  dependents: TreeNode[]        // Reverse edges

  // Tree queries (delegate to unit + tree)
  isComplete() -> checkpoint
  isBlocked() -> traverse dependencies
  findNextTask() -> traverse children
}

Unit {
  id, title, inputs, outputs    // TaskDefinition
  parent: Unit                   // Single parent reference
  context: TaskContext           // Path-based context with parent chain
  run() -> convergence loop      // Execution logic
  resolveChecks()                // Check resolution

  // NO children array - that's in TreeNode
  // NO dependencies array - that's in TreeNode
}
```

## Relationship

```
TaskTree
  ├─ nodes: Map<id, TreeNode>   // Fast lookup
  └─ root: TreeNode              // Virtual root
       └─ unit: Unit (virtual)

TreeNode (Epic)
  ├─ unit: Unit (Epic)           // Loaded from filesystem
  ├─ children: TreeNode[]        // Tree structure
  └─ findNextTask() -> TreeNode

  TreeNode (Task)
    ├─ unit: Unit (Task)         // Loaded from filesystem
    ├─ parent: Unit reference    // Via unit.parent
    ├─ children: TreeNode[]      // WBS subtasks
    └─ findNextTask() -> TreeNode

    TreeNode (Subtask)
      ├─ unit: Unit (Subtask)    // Loaded from filesystem
      ├─ parent: Unit reference  // Via unit.parent
      └─ findNextTask() -> null
```

## Key Insights

### 1. Unit Already Has Parent Chain

```typescript
// Unit.ts (current)
class Unit {
  parent: Unit | null; // ✅ Already exists
  context: TaskContext; // ✅ Has parent chain

  *walkAncestorContexts() {
    // ✅ Tree traversal
    let current = this.context?.parent;
    while (current) {
      yield current;
      current = current.parent;
    }
  }
}
```

### 2. TreeNode Wraps Unit

```typescript
// tree-node.ts (refactored)
class TreeNode {
  readonly unit: Unit;           // The actual task

  // Tree structure (TreeNode owns this)
  children: TreeNode[] = [];
  dependencies: TreeNode[] = [];
  dependents: TreeNode[] = [];

  // Convenience accessors (delegate to unit)
  get id() { return this.unit.id; }
  get parent() { return this.unit.parent; }
  get epicId() { return this.unit.context?.epicId; }
  get blocking() { return this.unit.blocking; }
  get tags() { return this.unit.tags; }

  // Tree queries (use tree structure + unit)
  async isComplete() { ... }
  async isBlocked() { ... }
  async findNextTask() { ... }
}
```

### 3. TaskTree Builds TreeNodes

```typescript
// task-tree.ts (refactored)
class TaskTree {
  private nodes: Map<string, TreeNode>;

  static async load(projectDir, config) {
    // 1. Load all Units from filesystem
    const units = await loadAllUnits(projectDir);

    // 2. Wrap each Unit in a TreeNode
    const nodes = new Map();
    for (const unit of units) {
      const node = new TreeNode(unit, checkpoint);
      nodes.set(unit.id, node);
    }

    // 3. Build tree edges (children, dependencies)
    for (const node of nodes.values()) {
      // Use unit.parent to build parent-child edges
      if (node.unit.parent) {
        const parentNode = findNodeByUnit(node.unit.parent);
        parentNode.children.push(node);
      }

      // Resolve dependencies to TreeNodes
      for (const depId of node.unit.dependencies || []) {
        const depNode = nodes.get(depId);
        node.dependencies.push(depNode);
        depNode.dependents.push(node);
      }
    }

    return new TaskTree(root, nodes, checkpoint);
  }
}
```

## Division of Responsibilities

### Unit Responsibilities

- **Task Definition**: id, title, inputs, outputs, vars, tags
- **Execution**: run(), resolveChecks(), resolvePrompt()
- **Parent Reference**: parent: Unit (single upward link)
- **Context**: TaskContext with path-based IDs
- **Convergence Loop**: while (hasGaps) { fixGaps }

### TreeNode Responsibilities

- **Tree Structure**: children: TreeNode[], dependencies, dependents
- **Tree Traversal**: findNextTask(), getChildren(), getAncestors()
- **State Queries**: isComplete(), isFailed(), isBlocked()
- **Blocking Logic**: Traverse dependencies + siblings + parent

### TaskTree Responsibilities

- **Tree Construction**: Load Units, wrap in TreeNodes, build edges
- **Fast Lookup**: nodes Map for O(1) access
- **Tree Shake**: reload() after WBS seeding
- **State Mutations**: markCompleted(), markFailed()
- **Aggregate Queries**: getProgress(), getBlockedTasks()

## Migration Strategy

### Step 1: Refactor TreeNode to Wrap Unit ✅

```typescript
class TreeNode {
  constructor(
    public readonly unit: Unit,
    private checkpoint: CheckpointManager,
  ) {}

  // Convenience accessors
  get id() {
    return this.unit.id;
  }
  get parent() {
    return this.unit.parent;
  }

  // Tree structure
  children: TreeNode[] = [];
  dependencies: TreeNode[] = [];
  dependents: TreeNode[] = [];
}
```

### Step 2: Update TaskTree to Load Units ✅

```typescript
static async load(projectDir, config) {
  // Load Units via existing factories
  const units = [];
  for (const taskFile of discoveredTasks) {
    const unit = await Unit.fromPath(taskFile);
    units.push(unit);
  }

  // Wrap in TreeNodes
  const nodes = new Map();
  for (const unit of units) {
    const node = new TreeNode(unit, checkpoint);
    nodes.set(unit.id, node);
  }

  // Build tree edges...
}
```

### Step 3: Remove Duplication

**BEFORE (Duplicated)**:

```typescript
// TreeNode had its own copies
class TreeNode {
  id: string;
  epicId: string;
  blocking: boolean;
  tags: string[];
  unit: Unit; // Also stored the unit
}
```

**AFTER (Delegates)**:

```typescript
// TreeNode delegates to unit
class TreeNode {
  readonly unit: Unit;

  get id() {
    return this.unit.id;
  }
  get epicId() {
    return this.unit.context?.epicId;
  }
  get blocking() {
    return this.unit.blocking;
  }
  get tags() {
    return this.unit.tags;
  }
}
```

## Benefits of Unified Design

1. **No Duplication**: TreeNode doesn't copy Unit properties
2. **Single Source of Truth**: Unit owns task definition
3. **Clear Separation**: Unit = execution, TreeNode = structure
4. **Natural Fit**: TreeNode.unit.parent already exists
5. **Composable**: Can have Unit without TreeNode (for testing)
6. **Type Safety**: TypeScript enforces Unit ⊂ TreeNode relationship

## Example Usage

```typescript
// Load tree (wraps Units in TreeNodes)
const tree = await TaskTree.load(projectDir, config);

// Get next task (hierarchical traversal)
const result = await tree.findNextTask();
const nextNode = result.node; // TreeNode

// Access Unit for execution
const unit = nextNode.unit;
await unit.run(); // Execute convergence loop

// Access parent via Unit
const parentUnit = unit.parent;
const parentContext = unit.context?.parent;

// Access children via TreeNode
const childNodes = nextNode.children; // TreeNode[]
const childUnits = childNodes.map((n) => n.unit); // Unit[]

// Query state via TreeNode
const isBlocked = await nextNode.isBlocked(); // Uses dependencies
const isComplete = await nextNode.isComplete(); // Uses checkpoint
```

## API Comparison

### BEFORE (Duplicated)

```typescript
// Had to keep Unit and TreeNode in sync
const unit = await Unit.fromPath(taskPath);
const nodeData = {
  id: unit.id,
  unit: unit,
  epicId: extractEpicId(taskPath),
  isWbsParent: !!unit.wbsFn,
  blocking: unit.blocking,
  tags: unit.tags,
};
const node = new TreeNode(nodeData, checkpoint);
```

### AFTER (Unified)

```typescript
// TreeNode wraps Unit directly
const unit = await Unit.fromPath(taskPath);
const node = new TreeNode(unit, checkpoint);

// TreeNode delegates to unit
console.log(node.id); // unit.id
console.log(node.blocking); // unit.blocking
console.log(node.parent); // unit.parent
```

## Decision: Unit.children vs TreeNode.children

**Question**: Should Unit.children exist, or only TreeNode.children?

**Answer**: Only TreeNode.children

**Reasoning**:

1. Unit already has parent chain via `parent: Unit`
2. Children are discovered **after** Units are loaded (WBS spawning)
3. TreeNode owns tree structure (children, dependencies)
4. Unit focuses on execution, TreeNode focuses on structure
5. Avoids duplication between Unit.children and TreeNode.children

**Exception**: Unit can have virtual children during WBS execution

```typescript
// In WBS function (temporary, not persisted)
const childUnit = Unit.fromDefinition(childDef, parentUnit);
parentUnit.children = [childUnit]; // Temporary

// After WBS completes, these become TreeNode.children
await tree.reload(); // Picks up new Units as TreeNodes
```

## Final Architecture

```
┌─────────────────────────────────────────────────────┐
│ TaskTree                                            │
│  ├─ nodes: Map<id, TreeNode>                       │
│  ├─ checkpoint: CheckpointManager (shadow tree)    │
│  └─ methods: load(), reload(), findNextTask()      │
└─────────────────────────────────────────────────────┘
                     │
                     ├─── wraps ────→ TreeNode
                     │                  ├─ unit: Unit ──┐
                     │                  ├─ children[]   │
                     │                  ├─ dependencies │
                     │                  └─ methods      │
                     │                                   │
                     └─── owns ─────→ Unit              │
                                       ├─ id            │
                                       ├─ parent ←──────┘
                                       ├─ context (path)
                                       ├─ run()
                                       └─ resolveChecks()
```

## Implementation Checklist

- [x] Create TreeNode that wraps Unit
- [x] TaskTree loads Units and wraps in TreeNodes
- [ ] Remove property duplication (use getters)
- [ ] Update TreeNode.parent to use unit.parent
- [ ] Build TreeNode.children from filesystem structure
- [ ] Resolve dependencies to TreeNodes
- [ ] Update autonomous-run to use TreeNode.unit
- [ ] Add tests for Unit ⊂ TreeNode relationship
