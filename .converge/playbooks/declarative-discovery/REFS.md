# Tree-abstraction callsite inventory

## Tree abstractions to delete (phase 06)

### Directories
- `packages/core/src/task/tree/` — entire directory
  - task-tree.ts, tree-node.ts, traversal.ts, visualizer.ts, types.ts,
    journal-tree.ts, index.ts

### Files
- `packages/core/src/task/unit/children.ts` — discoverChildren,
  discoverEpicChildren
- `packages/core/src/checkpoint/tree-utils.ts` — hashTaskTree,
  discoverTaskHierarchy

### Unit fields to remove
- `packages/core/src/task/unit/unit.ts`
  - `parent: Unit | null`
  - `children?: Unit[]`
  - `sortIndex`
  - `static compareBySortIndex`

## CLI consumers to migrate (phase 05)

For each, list the file, the current TaskTree usage, the equivalent
TaskDag replacement:

1. `packages/cli/src/commands-run.ts` — TaskTree.load() + iteration
   loop → executeDag()
2. `packages/cli/src/commands-list.ts` — task tree walk → dag.nodes
3. `packages/cli/src/commands-tree.ts` — TaskTree.load() +
   printTaskTree() → topologicalOrder() + layer display
4. `packages/cli/src/commands-gantt.ts` — tree traversal →
   topologicalOrder()
5. `packages/cli/src/commands-graph.ts` — TaskTree.load() →
   dag.toManifest()
6. `packages/cli/src/commands-inspect.ts` — walkTaskTree() →
   dag.nodes.get(id)
7. `packages/cli/src/next-task.ts` — buildTaskTree(), getTaskStates()
   → TaskDag queries
8. `packages/core/src/converge/converge-runner.ts` — TaskTree.load()
   in wave loop → executeDag()

## Every import of task/tree

Files that import from `task/tree`:

- `packages/cli/src/commands-run.ts` — `import { TaskTree } from "@converge/core/task/tree/index.ts"`
- `packages/cli/src/commands-tree.ts` — `import { TaskTree, JournalTree } from "@converge/core/task/tree/index.ts"`
- `packages/cli/src/commands-graph.ts` — `import { TaskTree } from "@converge/core/task/tree/index.ts"`
- `packages/cli/src/commands-gantt.ts` — `import { TaskTree } from "@converge/core/task/tree/index.ts"`
- `packages/cli/src/commands-journal.ts` — `import { JournalTree } from "@converge/core/task/tree/journal-tree.ts"`; `import type { JournalNode } from "@converge/core/task/tree/journal-tree.ts"`
- `packages/cli/src/next-task.ts` — `import type { TaskTree } from "@converge/core/task/tree/index.ts"`
- `packages/cli/src/cost-preflight.ts` — `import type { TaskTree } from "@converge/core/task/tree/index.ts"`
- `packages/cli/src/autonomous-run.ts` — `import { TaskTree } from "@converge/core/task/tree/index.ts"`
- `packages/core/src/converge/converge-runner.ts` — `import { TaskTree } from "../task/tree/index.ts"`
- `packages/core/src/task/playbook/input-contract.ts` — `import type { TaskTree } from "../tree/index.ts"`
- `packages/core/src/task/tree/__tests__/task-tree.test.ts` — `import { TaskTree } from "../task-tree.ts"`
- `packages/core/tests/integration/wbs-journal-spawn.test.ts` — `import { TaskTree } from "../../src/task/tree/task-tree.ts"`

Files that reference `TaskTree` (through re-exports or type usage, not direct task/tree import):

- `packages/cli/src/tree-display.ts` — `printTaskTree()` parameter type
- `packages/cli/src/commands-validate.ts` — uses `buildTaskTree`, `getTaskStates` from next-task.ts
- `packages/cli/src/reconcile.ts` — uses `buildTaskTree` from next-task.ts
- `packages/cli/src/commands-inspect.ts` — defines `walkTaskTree()`, uses `renderTaskTree`
- `packages/cli/src/inspect-display.ts` — defines `renderTaskTree()`
- `packages/cli/src/commands-compile.ts` — defines `discoverChildren()`

Files that import `discoverChildren` or `discoverEpicChildren`:

- `packages/core/src/task/unit/children.ts` — defines `discoverChildren()` and `discoverEpicChildren()`
- `packages/core/src/task/unit/fix-gaps.ts` — `import { discoverChildren } from "./children.ts"`
- `packages/core/src/navigator/core/actions/execution/run-executor.ts` — dynamic `import("../../../../task/unit/children.ts")`
- `packages/core/src/navigator/core/actions/execution/run-children.ts` — dynamic `import("../../../../task/unit/children.ts")`
- `packages/core/src/task/tree/traversal.ts` — calls `current.discoverChildren([])`
