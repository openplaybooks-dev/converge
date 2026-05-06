---
title: "Declarative Discovery — DAG-based task model"
description: "Replace tree-based playbook execution with a pure DAG. No iterations. No waves. No folder-scan discovery. Single topological pass."
---

# Declarative Discovery

> Replace tree-based playbook execution with a pure DAG. No iterations. No
> waves. No folder-scan discovery. No next-task computation. Single
> topological pass.
>
> Status: **in-progress** (phase 01 — DAG data model). Design doc phase.
>
> **Scope: DAG primitives, declarative loader, DAG runner, six-phase
> hard-cutover migration.**

## TL;DR

A Converge playbook today is a tree computed from the filesystem. The runner
scans folders, computes parent-child relationships from directory nesting,
builds a `TaskNode` tree, and then runs a convergence loop (iterations +
waves) over it. ~1800 lines of `next-task.ts` exist solely to compute what
to run next.

The replacement model: **every playbook is a DAG declared explicitly in its
TASK.md files.** Parents declare their children via `subtasks:`. Dynamic
children are spawned via `from_seed:`. The runner does one topological pass.
No iterations. No waves. No folder-scan discovery.

The file structure stays the same — directories still organize tasks on
disk — but it becomes metadata, not structure. The DAG is the structure.

```yaml
# Before (tree model — implicit, filesystem-driven)
# Parent: tasks/03-characters/TASK.md
# Children: discovered by scanning tasks/03-characters/ for numbered dirs

# After (DAG model — explicit, declaration-driven)
---
title: Characters
subtasks:
  - 01-analysis
  - 02-shared-references
  - 03-generation
---
```

## Motivation

### 1.1 What the tree model costs us

Today's execution model computes the entire task tree from the filesystem on
every run. The cost is structural, not just performance:

- **Folder-scan discovery.** `discoverChildren()` in
  `packages/core/src/task/unit/children.ts` scans directories for numbered
  subdirectories (`001-*`, `002-*`) containing `TASK.md`. The tree shape is
  a side effect of directory layout. Move a folder, change the tree.
  Rename a directory, break the tree.

- **Parent-child computed from nesting.** `Unit.parent` is set by the
  folder scanner. `Unit.children` is populated from the same scan. These
  fields are derivable from the filesystem but stored as if they were
  intrinsic properties. They go out of date the moment a new child is
  spawned or a directory is moved.

- **~1800 lines of `next-task.ts`.** The convergence loop in
  `packages/cli/src/next-task.ts` exists to answer one question: "what
  runs next?" It does this by building a `TaskNode` tree, computing status
  maps, resolving dependencies via fixed-point iteration, and assigning
  depth-first sequential indices. This is all accidental complexity — a
  DAG answers the same question with a topological sort in ~50 lines.

- **Iterations and waves.** The runner loops (convergence iterations) until
  no more tasks are runnable, each iteration re-evaluating the tree for
  gaps. Seed spawning triggers a new wave. Both concepts disappear when the
  graph is known in advance and executed in topological order.

- **`task/tree/` directory.** Seven files (`TreeNode`, `TaskTree`,
  tree-level dependency resolution) that exist solely to wrap the
  filesystem-derived tree into something the runner can consume. All of it
  is scheduled for deletion.

### 1.2 What a pure DAG buys

- **Explicit declarations.** Every edge is written in a TASK.md frontmatter
  field (`subtasks:`, `depends_on:`). You can read a task file and know
  exactly where it sits in the graph. No directory layout needed.

- **Deterministic topological execution.** `executeDag()` runs nodes in
  topological order. Layer 0 first (roots), then layer 1 (dependents of
  roots), and so on. Each node runs once. Ordinal position is deterministic
  for a given DAG.

- **Virtual nodes for dynamic tasks.** Tasks that don't exist on disk yet
  (children of a Seed that hasn't run) exist in the DAG as `virtual: true`
  nodes. They participate in topological sort and carry edges. When the
  parent completes and the seed spawner materializes them, virtual nodes
  become concrete.

- **No iterations, no waves.** The convergence loop is replaced by a
  single pass. `executeDag()` returns when every node has either run,
  been skipped (blocked by a failure), or been left pending (virtual,
  waiting for seed spawn).

- **Manifest IS the DAG.** `TaskDag.toManifest()` serializes to the
  existing `target/manifest.json` format. `TaskDag.fromManifest()`
  reconstructs. The manifest on disk is a serialized DAG — not a
  byproduct, but the source of truth.

## DAG primitives

### 2.1 `DagNode` interface

The fundamental unit of the DAG. One per task.

```typescript
type DagNodeStatus = 'pending' | 'ready' | 'running' | 'complete' | 'failed';

interface DagNode {
  /** Unique identifier. Matches the task's directory name or synthesized id. */
  id: string;

  /** IDs of nodes that declare this node in their `subtasks:` field. */
  parents: string[];

  /** IDs of nodes this node declares in its `subtasks:` field. */
  children: string[];

  /** IDs of nodes this node explicitly depends on (execution must wait). */
  depends_on: string[];

  /** IDs of nodes that explicitly depend on this node. */
  depended_on_by: string[];

  /** The task definition (frontmatter, body, checks, inputs, outputs). */
  taskDef: TaskDefinition;

  /** Filesystem path to this node's TASK.md. For virtual nodes, the
   *  path where the TASK.md will be written once materialized. */
  path: string;

  /** Current execution status. Initialized to 'pending'. */
  status: DagNodeStatus;

  /** True when this node does not yet have a TASK.md on disk.
   *  Virtual nodes are declared by `from_seed:` and materialized
   *  at runtime by the seed spawner. */
  virtual: boolean;
}
```

**Edge invariants (maintained by `TaskDag._syncEdges()`):**

- `b ∈ a.children` ⇔ `a ∈ b.parents`
- `b ∈ a.depends_on` ⇔ `a ∈ b.depended_on_by`

These are bidirectional: adding a node with `children: [x]` automatically
sets `x.parents` to include the new node. The four fields are derivable
from the two forward-declared ones (`children`, `depends_on`); the
backward fields (`parents`, `depended_on_by`) exist for O(1) traversal.

### 2.2 `DagNodeStatus` states

| State | Meaning |
|---|---|
| `pending` | Not yet executed. Initial state for all nodes. |
| `ready` | All `depends_on` are `complete`. Eligible for execution. (Computed, not stored.) |
| `running` | Currently executing. Set by the runner when work begins. |
| `complete` | Execution succeeded (all checks passed). Unblocks dependents. |
| `failed` | Execution failed (checks failed or agent errored). Blocks all dependents. |

`ready` is a computed status — `TaskDag.getReady()` returns all nodes
whose `depends_on` are all `complete` and whose own status is `pending`.
It is never stored on the node.

### 2.3 Virtual vs concrete nodes

| | Concrete | Virtual |
|---|---|---|
| **TASK.md on disk** | Yes | No (not yet) |
| **Source** | Discovered by loader from filesystem or `subtasks:` | Declared by `from_seed:` on a parent |
| **`.virtual`** | `false` | `true` |
| **`.path`** | Real path to existing TASK.md | Intended path once materialized |
| **Participates in topo sort** | Yes | Yes |
| **Can be executed** | Yes (has body, inputs, checks) | No (blocked until materialized) |
| **Materialized by** | N/A | Seed spawner, when parent completes |

Virtual nodes are the mechanism for dynamic task graphs. A parent with
`from_seed: my-template` declares that it will spawn children at runtime.
Those children exist in the DAG as virtual nodes from the moment the DAG
is loaded — they have IDs, edges, and positions in the topological order.
They just don't have TASK.md files yet.

### 2.4 `TaskDag` class

The container. Holds all nodes, computes roots and topological order.

```typescript
class TaskDag {
  nodes: Map<string, DagNode>;   // id → node. O(1) lookup.
  roots: DagNode[];              // nodes with no parents. Computed on mutation.

  /* Mutations */
  addNode(node: DagNode): void;  // Insert a node. Syncs edges. Recomputes roots.
                                  // Throws on duplicate id.

  /* Status */
  getReady(): DagNode[];         // Nodes whose depends_on are all complete,
                                  //   and whose own status is 'pending'.

  /* Traversal */
  getDownstream(id: string): DagNode[];   // depened_on_by of id.
  getUpstream(id: string): DagNode[];     // depends_on of id.

  /* State transitions */
  markComplete(id: string): void; // Sets status='complete'.
  markFailed(id: string): void;   // Sets status='failed'.

  /* Topological order */
  topologicalOrder(): DagNode[][]; // Layers. Layer 0 = roots. Layer N =
                                    //   dependents of layer N-1 with all
                                    //   dependencies satisfied.

  /* Serialization */
  toManifest(): Manifest;                 // Serialize to manifest format.
  static fromManifest(m: Manifest): TaskDag; // Deserialize from manifest.
}
```

**Root computation** (`_recomputeRoots()`): any node with `parents.length === 0`
is a root. Roots are recomputed on every `addNode()` call. In a well-formed
playbook, roots are the top-level tasks declared in `playbook.yml`.

**Edge synchronization** (`_syncEdges(node)`): when a node is added, all
existing nodes that appear in the new node's `children`, `parents`,
`depends_on`, or `depended_on_by` arrays have their corresponding reverse
edges updated. This maintains the bidirectional invariants.

### 2.5 Topological sort

Kahn's algorithm, implemented in `packages/core/src/dag/topological-sort.ts`.

```typescript
function topologicalSort(nodes: Map<string, DagNode>): string[][];
function detectCycle(nodes: Map<string, DagNode>): string[] | null;
```

- `topologicalSort` returns layers: `string[][]`. Layer 0 contains nodes
  with in-degree 0. Layer N contains nodes whose dependencies are all in
  layers < N. Within a layer, order is insertion order (deterministic for
  a given loader run).

- `detectCycle` uses 3-color DFS. Returns the cycle path as `[v, ..., v]`
  or `null` if acyclic. Called by `topologicalSort` when no zero-in-degree
  nodes remain but nodes are still unvisited. Throws with a readable
  cycle path: `"03-tokens → 02-visual-spec → 03-tokens"`.

## The `subtasks:` field

### 3.1 Syntax

The `subtasks:` field in TASK.md frontmatter declares this task's direct
children in the DAG. It replaces the old implicit parent-child relationship
derived from directory nesting.

**Bare id (string form):**

```yaml
subtasks:
  - 01-analysis
  - 02-shared-references
  - 03-generation
```

Each string is a child's `id`. The child's path defaults to the parent's
directory + child id.

**Object form with `path:` override:**

```yaml
subtasks:
  - id: 01-analysis
  - id: 02-shared-references
    path: ../shared/02-shared-references   # child lives elsewhere
  - id: 03-generation
```

Use `path:` when the child's directory is not a subdirectory of the parent.
The path is relative to the playbook root.

**Mixed arrays:**

```yaml
subtasks:
  - 01-analysis                        # bare string
  - id: 02-shared-references
    path: ../shared/02-shared-references
  - 03-generation                      # bare string
```

Arrays can mix bare strings and objects. This is the common case — most
children follow the default path convention, with occasional overrides.

### 3.2 Validation rules

1. **Every child id must be unique within a single `subtasks:` array.**
   Duplicate `01-analysis` in the same parent is an error.

2. **A child id must resolve to exactly one path.** The path registry
   enforces this (see §5).

3. **A node may have at most one parent via `subtasks:`.** If two tasks
   declare `subtasks: [01-analysis]`, the second declaration is an error
   at load time. (A node can have additional parents via `depends_on`,
   but only one structural parent via `subtasks:`.)

4. **Self-reference is forbidden.** A task cannot list itself in its own
   `subtasks:`.

5. **`subtasks:` and `from_seed:` are mutually exclusive.** A task declares
   its children either statically (`subtasks:`) or dynamically
   (`from_seed:`), not both.

### 3.3 Relationship to directory nesting

The file structure on disk becomes **metadata, not structure.** A task's
directory layout is a convention for organizing files — TASK.md, inputs/,
outputs/, seed/ — not a declaration of graph edges.

- **Default path convention:** if a child's path is not overridden, it
  defaults to `<parent-dir>/<child-id>/`. This preserves the familiar
  directory layout for the common case.

- **Override via `path:`:** when a child lives elsewhere (shared subtrees,
  cross-cutting concerns), the `path:` field overrides.

- **No implicit discovery:** the loader does not scan directories for
  children. If a child is not declared in `subtasks:` or `from_seed:`, it
  is not in the DAG. A TASK.md in a subdirectory without a corresponding
  `subtasks:` entry is unreachable — it will never be executed.

## The `from_seed:` field

### 4.1 Purpose

`from_seed:` declares that this task spawns children dynamically at runtime,
from a seed definition. It replaces the old `seed:` mechanism for dynamic
child creation while integrating with the DAG runner.

```yaml
---
title: Characters
from_seed: per-character-pipeline
seed_args:
  catalog: assets/characters-catalog.json
---
```

### 4.2 How it works

1. **At DAG load time:** the loader encounters `from_seed: <name>` on a
   task. It resolves the seed by name from the project's seed library
   (`.seed.md` files). If the seed has a `preview_manifest`, the loader
   reads it and creates one virtual `DagNode` per predicted child.
   Otherwise, it creates a single `#frontier` placeholder virtual node.

2. **During execution:** when the parent task completes, the DAG runner
   calls the seed spawner. The seed spawner materializes child TASK.md
   files to disk. The runner replaces the virtual placeholder(s) with
   concrete nodes.

3. **After spawn:** the concrete children execute in their topological
   position (they were already in the DAG as virtual nodes, so their
   position in the order is already determined).

### 4.3 Integration with child-synthesizer and seed-spawner

From `dbt-paradigm` (already shipped):

**`child-synthesizer.ts`** — resolves seed entries into child tasks:

```typescript
interface SynthesizeEntry {
  seed: SeedMdDefinition;
  args?: Record<string, string>;
  path?: string;          // optional path override
}

interface SynthesizeResult {
  childIds: string[];
  paths: string[];
}

function synthesize(parent: TaskDefinition, entries: SynthesizeEntry[]): SynthesizeResult;
```

**`seed-spawner.ts`** — materializes seed entries to disk:

```typescript
interface SeedSpawnEntry {
  seed: SeedMdDefinition;
  args?: Record<string, string>;
  path?: string;          // optional path override
}

interface SeedSpawnResult {
  taskIds: string[];
  paths: string[];
}

async function spawnSeeds(ctx: SeedContext, entries: SeedSpawnEntry[]): Promise<SeedSpawnResult>;
function resolveSeed(name: string, seedLibrary: Map<string, SeedMdDefinition>): SeedMdDefinition | null;
```

**`seed-md-definition.ts`** — the seed definition format (`.seed.md` files):

```typescript
interface SeedMdDefinition {
  name: string;
  description?: string;
  kind: 'nodejs' | 'python' | 'shell' | 'skill' | 'template';
  args?: Record<string, unknown>;
  preview_manifest?: string;  // path to a JSON file predicting child IDs
}
```

The DAG runner calls `spawnSeeds()` when a parent with `from_seed:`
completes, passing the parent's `seed_args` merged with the seed
definition's `args`. The spawner writes TASK.md files and returns the IDs
and paths. The runner then replaces the virtual node(s) with concrete ones
and continues execution.

### 4.4 Virtual node lifecycle

```
DAG loaded
  └─ Parent (concrete) has from_seed: my-seed
       └─ Virtual node(s) created (exists in DAG, has edges, no TASK.md)

Execution (topological pass)
  └─ Parent runs → completes
       └─ spawnSeeds() called
            └─ TASK.md files written to disk
            └─ Virtual node → concrete (path now points to real TASK.md)

  └─ Children run (they were already in the topological order)
```

If the parent fails, virtual children remain virtual and are skipped
(downstream of a failed node → blocked).

## The path registry

### 5.1 Purpose

The path registry maintains the `id → path` mapping for every node in the
DAG. It is the single source of truth for where a task lives on disk.

### 5.2 Path resolution rules

**Default path (no override):**

```
path = <parent-directory>/<child-id>/
```

Example: parent `tasks/03-characters/` + child id `01-analysis` →
`tasks/03-characters/01-analysis/`.

**Override path (via `path:` in `subtasks:` entry):**

```yaml
subtasks:
  - id: 02-shared-references
    path: tasks/shared/02-shared-references
```

Path is relative to the playbook root. The loader resolves it to an
absolute path.

**Root tasks (declared in `playbook.yml`):**

Root tasks have no parent. Their paths are declared in `playbook.yml`:

```yaml
tasks:
  - id: 01-define
    path: tasks/01-define
  - id: 02-visual-spec
    path: tasks/02-visual-spec
```

**Virtual nodes (from `from_seed:`):**

Virtual nodes get their path from the seed spawner. If the seed entry has
a `path:` override, that path is used. Otherwise, the path defaults to the
parent's directory + the synthesized child id.

### 5.3 Duplicate detection

The path registry enforces:

1. **No two nodes may share the same path.** If the loader encounters a
   `subtasks:` entry whose resolved path is already registered, it errors:
   `Duplicate path: "tasks/shared/02-references" (claimed by both
   "03-characters/02-refs" and "04-tile-maps/02-refs")`.

2. **No two nodes may share the same id.** `TaskDag.addNode()` enforces this.

3. **A child id must resolve to a path that exists or can be created.**
   For concrete nodes, the path must contain a TASK.md. For virtual nodes,
   the path's parent directory must exist (so the spawner can write there).

### 5.4 Implementation note

The path registry will live at `packages/core/src/config/path-registry.ts`.
It will be populated during DAG loading (phase 02) and consulted by the
loader, the seed spawner, and the CLI for path-based lookups.

## DAG semantics

### 6.1 Multi-parent (DAG, not tree)

A node can have multiple parents. This is the critical difference from the
tree model, where every node has exactly one `parent` (except the root).

Multiple parents arise from:

- **`depends_on` edges.** Task C can depend on both A and B without either
  being its "structural" parent.

- **Shared subtrees.** A utility task can be a child of multiple phase
  tasks. The path registry (not the parent-child relationship) determines
  where it lives on disk.

This is a DAG, not a tree: a node can be reached via multiple paths.

### 6.2 Cycle detection

Cycles are detected at DAG load time by `detectCycle()`. A cycle is a
hard error — the DAG is invalid and will not be executed.

Error format:
```
Cycle detected in DAG: 03-tokens → 02-visual-spec → 01-define → 03-tokens
```

The `depends_on` edges form the primary graph for cycle detection.
`subtasks:` edges also participate — a parent depends on its children's
completion (for container tasks), so `subtasks:` edges create implicit
`depends_on` edges from children to parent.

### 6.3 Explicit edges vs implicit nesting

**Explicit edges** are written in TASK.md frontmatter:
- `subtasks:` — structural edges. "I decompose into these tasks."
- `depends_on:` — data-flow edges. "I need these tasks' outputs before I
  can run."

**Implicit nesting** (the old model) is gone:
- Directory nesting no longer implies parent-child relationships.
- `Unit.parent` and `Unit.children` are removed (phase 06).
- The loader does not scan subdirectories for children.

### 6.4 Siblings, depends_on, depended_on_by

- **Siblings** are nodes that share a parent via `subtasks:`. They execute
  in the same topological layer (if they have no cross-dependencies) or in
  sequence (if declared via `depends_on`).

- **`depends_on`** declares explicit execution ordering. "B depends_on A"
  means B waits for A to complete before running. A failure in A blocks B.

- **`depended_on_by`** is the reverse edge, computed automatically. If B
  depends_on A, then A's `depended_on_by` includes B.

### 6.5 Container tasks and completion

A task with `subtasks:` (a container) has an implicit dependency on all its
children completing. This is enforced by the DAG runner: a container's
children must all be `complete` before the container itself can be marked
`complete`. (Containers are typically non-executable — they exist to group
children, not to do work themselves. But a container can also have its own
body and checks, in which case it runs, then its children run, then the
container awaits their completion.)

## DAG runner

### 7.1 `executeDag()` — single topological pass

```typescript
async function executeDag(
  dag: TaskDag,
  context: ExecutionContext,
  options?: ExecuteDagOptions,
): Promise<ExecutionResult>;
```

The runner takes a loaded `TaskDag` and executes every node in topological
order. One pass. No re-evaluation. No convergence loop.

### 7.2 Algorithm

```
1. Compute topological order: layers = dag.topologicalOrder()
2. For each layer in layers:
     a. For each node in layer:
        i.   If node is virtual → skip (not yet materialized)
        ii.  If any depends_on is failed → mark blocked, skip
        iii. Execute node (run agent, evaluate checks)
        iv.  On success: markComplete(id)
        v.   On failure: markFailed(id)
             If failFast → abort entire run
        vi.  If node has from_seed: and completed successfully:
             - Call spawnSeeds()
             - Replace virtual children with concrete nodes
             - Add new concrete nodes to current/future layers
     b. If new nodes were spawned in this layer, recompute remaining
        topological order (new nodes may have edges to unexecuted nodes)
3. Return ExecutionResult { completed, failed, skipped, blocked }
```

### 7.3 Layer-by-layer execution

All nodes within a layer have their dependencies satisfied and can execute
concurrently (though v1 is sequential — parallelism is deferred). A layer
completes when every node in it has either completed, failed, or been
skipped (virtual/blocked).

### 7.4 Failed-node blocking

When a node fails:
- Its status is set to `failed`.
- Any node whose `depends_on` includes the failed node's id is **blocked**.
  Blocked nodes are skipped (not executed) and their status remains
  `pending`.
- Blocking is transitive: if A fails, B depends on A, and C depends on B,
  C is also blocked.

### 7.5 Dynamic spawn mid-execution

When a parent with `from_seed:` completes successfully:

1. The seed spawner materializes child TASK.md files to disk.
2. The virtual node(s) for those children are replaced with concrete nodes
   in the DAG.
3. The concrete children are inserted into the remaining topological order.
   They already have edges (declared when the virtual nodes were created),
   so their position in the order is deterministic.
4. Execution continues with the updated DAG.

This is the only mutation to the DAG during execution. The topological
order may be partially recomputed if spawned children have edges to nodes
that haven't executed yet.

### 7.6 No iterations, no waves

The convergence loop (`while (some task is runnable) { plan; execute;
re-evaluate }`) is replaced by the single topological pass. There is no
loop. There are no waves. The DAG is loaded once, executed once, and the
result is final.

The old concepts that disappear:
- **Iterations:** the runner no longer re-evaluates "what's runnable now"
  after each task. The answer is always "the next layer in topological
  order."
- **Waves:** Seed spawning no longer triggers a new wave. Spawned children
  are inserted into the existing topological pass.
- **Gap evaluation:** the runner no longer checks for gaps (tasks that
  should exist but don't). If a task isn't in the DAG, it doesn't exist.
- **`calculateExecutionPlan()`:** the depth-first sequential index
  assignment is replaced by topological layer assignment.

## The cutover plan

Six phases. No fallback after phase 06. No env flag. Hard cutover.

### Phase 01 — DAG data model
**Status: in progress**

- `DagNode`, `DagNodeStatus`, `TaskDag`, `topologicalSort`, `detectCycle`
  land in `packages/core/src/dag/`.
- TASK.md parser accepts `subtasks:` and `from_seed:` fields (schema only,
  no loader or runner changes).
- This design doc exists.
- REFS catalog exists (contract compliance checks).

**Gate:** `tsc --noEmit` passes. Unit tests for topological sort (linear,
diamond, cycle) green. TASK.md parses new fields.

### Phase 02 — Declarative loader
**Status: not started**

- BFS walker from `playbook.yml` roots through `subtasks:` declarations.
- Path registry (`id → path` mapping) with duplicate detection.
- Virtual nodes for `from_seed:` parents.
- Cross-loader parity test (declarative loader produces same node set as
  tree loader for existing playbooks).

**Gate:** `loader-parity.test.ts` passes. Cycle detection produces clear
errors.

### Phase 03 — DAG runner
**Status: not started**

- `executeDag()` — single topological pass.
- Dynamic spawn mid-execution materializes virtual nodes.
- Failed-node blocking (downstream nodes skipped).
- `dag-runner.test.ts` covers linear, diamond, and spawn scenarios.

**Gate:** Linear and diamond DAGs execute in correct order. Spawned nodes
appear mid-execution. `pnpm -r test` green.

### Phase 04 — Migrate playbooks
**Status: not started**

- Every live playbook gets `subtasks:` declarations on every parent task.
- Per-playbook parity test verifies the DAG matches the tree for each
  playbook.
- `from_seed:` replaces `seed:` where applicable.

**Gate:** Every playbook compiles under the declarative loader. Per-playbook
parity test green.

### Phase 05 — Migrate CLI consumers
**Status: not started**

- Replace `TaskTree` with `TaskDag` in every CLI command (`run`, `list`,
  `show`, `inspect`, `clean`, `build`, `test`, `compile`).
- `next-task.ts` replaced by `dag.topologicalOrder()` + `dag.getReady()`.
- `TaskTree` becomes unreferenced by end of phase.

**Gate:** All CLI commands functional. `pnpm -r test` green. Zero imports
of `TaskTree` from CLI code.

### Phase 06 — Strip tree
**Status: not started**

- Delete `packages/core/src/task/tree/` (entire directory — 7 files).
- Delete `packages/core/src/task/unit/children.ts`.
- Delete `packages/core/src/checkpoint/tree-utils.ts`.
- Remove `Unit.parent: Unit | null` and `Unit.children?: Unit[]`.
- Remove `next-task.ts` (~1800 lines).
- Tombstone test: `no-tree-abstractions.test.ts` asserts zero imports
  from deleted modules.

**Gate:** Tombstone test green. Zero imports from `task/tree/`. `pnpm -r
typecheck && pnpm -r test` green.

### Hard cutover rule

There is no `CONVERGE_DECLARATIVE_DISCOVERY` environment flag. No
backwards-compatibility shim. No fallback code path. After phase 06, the
tree abstractions do not exist. Any code that hasn't been migrated by
phase 05 will fail to compile.

## Selector compatibility

### 9.1 `--select` grammar unchanged

The `--select` / `--exclude` DSL (from `cli-redesign`) works against DAG
nodes exactly as it worked against tree nodes. The grammar, operators, and
selector methods are identical.

All existing operators and methods remain valid:

| Operator | DAG behavior |
|---|---|
| `task_id` | Node with matching id |
| `task_id+` | Node + all descendants (follows `depended_on_by` edges) |
| `+task_id` | Node + all ancestors (follows `depends_on` edges) |
| `+task_id+` | Node with full lineage |
| `@task_id` | Full subgraph (ancestors + ancestors-of-descendants) |

| Method | DAG behavior |
|---|---|
| `name:` | Substring match on node id |
| `tag:` | Match on `tags:` in taskDef |
| `path:` | Match on `path:` in DagNode |
| `status:` | Read from `DagNode.status` |
| `result:` | Read from `run_results.json` |
| `state:modified.*` | Hash diff against `--state` manifest |
| `selector:` | Named selector from `selectors.yml` |

### 9.2 Key differences

The selection semantics are identical, but the implementation changes:

- **Resolution is against `TaskDag.nodes`, not `TaskTree`.** Selectors
  iterate the `Map<string, DagNode>` instead of traversing a tree.

- **Tree-specific selectors are removed.** `seed:` and `frontier:` selectors
  lose their meaning in a DAG model — there are no Seed parents (replaced
  by `from_seed:` / virtual nodes) and no frontiers (replaced by virtual
  nodes that explicitly exist in the DAG).

- **`+` and `@` traverse the flat edge sets.** `dag.getDownstream(id)`
  and `dag.getUpstream(id)` are O(1) lookups followed by array iteration,
  not recursive tree walks.

- **Virtual nodes are selectable.** A virtual node has an `id` and `path`
  and participates in `+`/`@` traversal. Users can select virtual nodes
  to preview what will be spawned (they will appear in `list` output with
  a `[virtual]` tag but won't execute).

### 9.3 Selector resolution order

1. Parse the selector expression (unchanged from `packages/core/src/select/`).
2. Resolve against `dag.nodes`:
   - Atom selectors (`name:`, `tag:`, `path:`) filter the nodes map.
   - Graph operators (`+`, `@`) traverse `depends_on` / `depended_on_by` /
     `parents` / `children` edges.
   - Set operators (space, comma, `--exclude`) combine or subtract sets.
3. Return the set of matching node ids.

## Reference: file map

| File | Phase | Purpose |
|---|---|---|
| `packages/core/src/dag/dag-node.ts` | 01 | `DagNode` interface, `DagNodeStatus` type |
| `packages/core/src/dag/topological-sort.ts` | 01 | Kahn's algorithm, cycle detection |
| `packages/core/src/dag/task-dag.ts` | 01 | `TaskDag` class (nodes, roots, queries, serialization) |
| `packages/core/src/dag/index.ts` | 01 | Public exports |
| `packages/core/src/config/task-definition.ts` | 01 | Add `subtasks:` and `from_seed:` fields |
| `packages/core/src/config/task-md-definition.ts` | 01 | Parse new frontmatter fields |
| `packages/core/src/config/declarative-loader.ts` | 02 | BFS loader from `subtasks:` declarations |
| `packages/core/src/config/path-registry.ts` | 02 | `id → path` mapping, duplicate detection |
| `packages/core/src/dag/dag-runner.ts` | 03 | `executeDag()` — single topological pass |
| `packages/core/tests/dag/topological-sort.test.ts` | 01 | Linear, diamond, cycle test cases |
| `packages/core/tests/dag/task-dag.test.ts` | 01 | Add, getReady, markComplete, serialization |
| `packages/core/tests/dag/dag-runner.test.ts` | 03 | Execution order, spawn, failure blocking |
| `packages/core/tests/config/loader-parity.test.ts` | 02 | Cross-loader parity |
| `packages/core/tests/no-tree-abstractions.test.ts` | 06 | Tombstone — asserts tree code is gone |
| `docs/design/declarative-discovery.md` | 01 | This document |

### Files deleted in phase 06

| File | Reason |
|---|---|
| `packages/core/src/task/tree/` (7 files) | Replaced by `TaskDag` |
| `packages/core/src/task/unit/children.ts` | Replaced by `subtasks:` declarations |
| `packages/core/src/checkpoint/tree-utils.ts` | Tree-specific checkpoint logic |
| `packages/cli/src/next-task.ts` | Replaced by `dag.topologicalOrder()` |
| `Unit.parent`, `Unit.children` fields | Replaced by `dag.nodes` edges |

## Open questions

1. **Container task execution.** Should a task with `subtasks:` be allowed
   to also have a body and checks (executable container), or should
   containers be pure grouping nodes? Current answer: allowed. A container
   can have its own body — it runs first, then its children. Final
   semantics TBD in phase 03.

2. **Virtual node cardinality.** When `from_seed:` references a seed with
   a `preview_manifest` containing 50 predicted children, do we create 50
   virtual nodes at load time or one placeholder? Current answer: 50
   virtual nodes if the preview manifest exists, one `#frontier` placeholder
   if not. This should be validated against real seed definitions.

3. **Partial spawn.** If a seed spawner produces a subset of the predicted
   children (e.g., catalog says 50 but spawner creates 48), how do we
   handle the 2 unmatched virtual nodes? Current answer: unmatched
   virtual nodes remain `virtual: true` and are skipped. A warning is
   emitted. The spawner is responsible for accuracy.

4. **Selector compatibility with `seed:` and `frontier:`.** These selector
   methods from `cli-redesign` are tree-model concepts. Should they be
   removed, deprecated with a migration path, or reinterpreted for the
   DAG model (`seed:` → `from_seed:` parents, `frontier:` → virtual nodes)?
   Current answer: reinterpreted. `seed:unseeded` = nodes with `from_seed:`
   whose virtual children are still virtual. `frontier:` = virtual nodes
   without a preview manifest. Phase 05 resolves this.

5. **`--select` over virtual nodes.** If a user runs
   `--select 'virtual-child+'`, the virtual child exists in the DAG and
   can be selected, but cannot execute (it has no TASK.md). Should the
   runner auto-seed the parent first? Current answer: no. The runner
   skips virtual nodes and reports them. The user must run the parent
   first (or `compile --seed` to pre-materialize).

6. **`subtasks:` on root tasks.** Root tasks are declared in `playbook.yml`.
   Can a root task also declare `subtasks:` in its TASK.md? Current
   answer: yes. The `playbook.yml` `tasks:` list defines entry points;
   `subtasks:` in TASK.md defines the subgraph. A task can be both a root
   (entry point) and a container (has children).

7. **Edge cases in topological recomputation after spawn.** If spawned
   children have `depends_on` edges to nodes in earlier layers (that have
   already executed), that's a loader-time error. The spawned children's
   edges must point to nodes in the same or later layers. How is this
   enforced? Current answer: the loader validates edge direction at load
   time. Virtual nodes inherit the topological position of their parent's
   layer + 1. Edges to earlier layers are rejected.

8. **Manifest format for virtual nodes.** How are virtual nodes represented
   in `target/manifest.json`? Current answer: `state: "expected"` for
   preview-manifest-predicted nodes, `state: "frontier"` for the
   single-placeholder case. Both have `virtual: true` in the DagNode and
   no concrete path. The manifest schema from `cli-redesign` §6.1 already
   supports this.
