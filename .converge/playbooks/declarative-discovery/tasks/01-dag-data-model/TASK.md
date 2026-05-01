---
title: DAG primitives (DagNode, TaskDag, topological-sort); TASK.md schema accepts children: and from_seed:; design doc + REFS inventory
description: |
  Land the DAG data model under packages/core/src/dag/ and extend the
  TASK.md frontmatter schema to accept children: and from_seed: fields.
  Also produce the design doc, REFS inventory, and migration catalog
  that every later phase reads as input. No loader or runner changes
  yet — schema and data model only.

inputs:
  - docs/design/cli-redesign.md
  - .converge/playbooks/dbt-paradigm/PLAN.md
  - packages/core/src/config/loader.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/task-definition.ts
  - packages/core/src/manifest

outputs:
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/topological-sort.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/dag/index.ts
  - packages/core/src/config/task-definition.ts
  - packages/core/src/config/task-md-definition.ts
  - docs/design/declarative-discovery.md
  - .converge/playbooks/declarative-discovery/REFS.md
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json
  - .converge/playbooks/declarative-discovery/contract-probe-report.md

checks:
  - id: contract-probe-report-present
    cmd: test -s .converge/playbooks/declarative-discovery/contract-probe-report.md
    description: Contract probe (00-contract-probe leaf) ran and its report exists.
  - id: dag-node-exists
    cmd: test -s packages/core/src/dag/dag-node.ts
    description: DagNode module exists.
  - id: topological-sort-exists
    cmd: test -s packages/core/src/dag/topological-sort.ts
    description: Topological sort module exists.
  - id: task-dag-exists
    cmd: test -s packages/core/src/dag/task-dag.ts
    description: TaskDag module exists.
  - id: children-field-parses
    cmd: pnpm --filter @converge/core test -- children-field
    description: children: field parses bare-id, object, and mixed forms.
  - id: from-seed-field-parses
    cmd: pnpm --filter @converge/core test -- from-seed-field
    description: from_seed: field parses.
  - id: topological-sort-linear
    cmd: pnpm --filter @converge/core test -- topological-sort -- linear
    description: Linear DAG (A→B→C) sorts correctly.
  - id: topological-sort-diamond
    cmd: pnpm --filter @converge/core test -- topological-sort -- diamond
    description: Diamond DAG (A→[B,C]→D) sorts with B and C in the same layer.
  - id: topological-sort-cycle
    cmd: pnpm --filter @converge/core test -- topological-sort -- cycle
    description: Cycle detection throws with the cycle path in the error message.
  - id: design-doc-present
    cmd: test -s docs/design/declarative-discovery.md
    description: Design doc exists and is non-empty.
  - id: refs-md-present
    cmd: test -s .converge/playbooks/declarative-discovery/REFS.md
    description: Tree-abstraction callsite inventory exists.
  - id: catalog-valid-json
    cmd: jq -e 'type == "array"' .converge/playbooks/declarative-discovery/playbooks-catalog.json
    description: Per-playbook migration catalog is a JSON array.
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck after DAG primitives land.
  - id: baseline-tests-green
    cmd: pnpm -r test
    description: Baseline test suite green before any work begins.

skills: []
references:
  - "docs/design/cli-redesign.md"
  - "@.converge/playbook-chain.md"
  - ".converge/playbooks/dbt-paradigm/PLAN.md"

vars: {}
dependencies: []
---

# 01 — DAG data model + schema

This phase lands the foundation. No loader or runner changes — just the
DAG primitives and the schema accepting new TASK.md fields. The existing
tree-based execution continues to work unchanged.

## Step 0 — Contract probe (failing-fast gate)

The `00-contract-probe/` sub-task runs first. It performs behavioral
checks against cli-redesign, remove-goals, and dbt-paradigm — verifying
that `child-synthesizer.synthesize`, `seed-spawner.spawnDynamicChildren`,
the seed/test schemas, the manifest's `libraries:` section, and the
absence of WBS all hold as this playbook's later phases assume.

## Step 1 — `packages/core/src/dag/`

### `dag-node.ts`

```ts
export interface DagNode {
  id: string;
  parents: string[];       // incoming edges (who declares me as a child)
  children: string[];      // outgoing edges (who I declare as children)
  depends_on: string[];    // execution dependencies
  depended_on_by: string[];// reverse deps (computed at DAG build time)
  taskDef: TaskDefinition; // the actual task config (inherited)
  path: string;            // file path — metadata, not structure
  status: DagNodeStatus;
}

export type DagNodeStatus = 'pending' | 'ready' | 'running' | 'complete' | 'failed';
```

DagNode is pure data — no execution logic. It replaces `Unit`'s tree role
(`parent: Unit | null`, `children?: Unit[]`) while `Unit` continues to own
execution (convergence loop, checks, etc.).

### `topological-sort.ts`

Kahn's algorithm:

```ts
export function topologicalSort(nodes: Map<string, DagNode>): DagNode[][];
// Returns layers — nodes in the same layer have no dependencies on each other
// and can run in parallel.

export function detectCycle(nodes: Map<string, DagNode>): string[] | null;
// Returns the cycle path if one exists, null otherwise.
```

### `task-dag.ts`

```ts
export class TaskDag {
  nodes: Map<string, DagNode>;
  roots: DagNode[];  // nodes with no incoming children: edges

  getReady(): DagNode[];
  getDownstream(id: string): DagNode[];
  getUpstream(id: string): DagNode[];
  markComplete(id: string): void;
  markFailed(id: string): void;
  addNode(node: DagNode): void;  // for WBS spawns
  topologicalOrder(): DagNode[][];

  toManifest(): Manifest;
  static fromManifest(m: Manifest): TaskDag;
}
```

Serializes to/from the existing `Manifest` format (`child_map`,
`parent_map`).

## Step 2 — TASK.md schema extension

### `task-definition.ts`

Add to `TaskDefinition`:

```ts
children?: (string | { id: string; path?: string })[];  // static declared children
from_seed?: string;  // dynamic children from spawning seed
```

### `task-md-definition.ts`

Parse `children:` and `from_seed:` from TASK.md frontmatter:

- `children:` — array of bare strings or `{ id, path? }` objects.
  Normalize to `ParsedChild[]` where each entry has `id` and optional
  `path`.
- `from_seed:` — string, the name of a spawning seed.
- Add both to `RESERVED_KEYS`.

Validation:
- Every `id` in `children:` must be a non-empty string matching the
  task id grammar (alnum + dashes).
- A `path:` override must be a relative path; absolute is an error.
- Duplicate `id` within one parent's `children:` is an error.

## Step 3 — `docs/design/declarative-discovery.md`

The spec of record. Sections:

1. **Motivation.** What the tree model costs us. What a DAG buys.
2. **DAG primitives.** DagNode, TaskDag, topological-sort — contracts.
3. **The `children:` field.** Hybrid syntax. Bare id, object form with
   `path:` override, `from_seed:` for dynamic.
4. **The path registry.** `id → path`. Duplicate ids error.
5. **Spawning-seed integration.** DAG node addition at runtime.
   Location-independent children.
6. **DAG semantics.** Multi-parent, cycle detection, DAG ≠ tree.
7. **DAG runner.** Topological execution via Kahn's algorithm.
8. **The cutover plan.** Six phases. No fallback after phase 06.
9. **Selector compatibility.** `--select` grammar unchanged.

## Step 4 — REFS.md inventory

Every callsite of tree abstractions to be deleted in phase 06:

### Tree abstractions to delete
- `packages/core/src/task/tree/` — entire directory
- `packages/core/src/task/unit/children.ts` — folder-scan discovery
- `packages/core/src/checkpoint/tree-utils.ts` — tree-specific utils

### Consumers to migrate (phase 05)
- `packages/cli/src/commands-run.ts`
- `packages/cli/src/next-task.ts` (largest — ~1800 lines)
- `packages/cli/src/commands-tree.ts`
- `packages/cli/src/commands-gantt.ts`
- `packages/cli/src/commands-graph.ts`
- `packages/cli/src/commands-inspect.ts`
- `packages/cli/src/autonomous-run.ts`
- `packages/cli/src/reconcile.ts`
- `packages/cli/src/tree-display.ts`
- `packages/core/src/converge/converge-runner.ts`

## Step 5 — `playbooks-catalog.json`

JSON array, one entry per playbook to migrate in phase 04.

## Done when

All checks pass. DAG primitives exist and are tested. TASK.md parses
the new fields. Design doc and inventories exist. Folder-scan unchanged.
