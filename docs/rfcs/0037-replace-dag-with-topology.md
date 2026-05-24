---
rfc: 0037
title: Replace DAG with TaskTopology — levels-based execution model
status: proposed
type: breaking
source: human
priority_tier: tier0
estimate: "2-3 weeks"
backwards_compatible: no
risk: high
breaks_existing: yes
migration_plan: "see body — TaskTopology replaces TaskDag; tasks.jsonl becomes sole source of truth; manifest.json and runstate.json removed"
---

# RFC 0037: Replace DAG with TaskTopology

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **proposed** | Written, awaiting review |
| Define TaskTopology data structure | **pending** | |
| Build topology from tasks.jsonl | **pending** | Replace buildDagFromUnifiedInventory |
| Replace run() execution loop | **pending** | Wave-based level execution |
| Remove TaskDag, manifest.json, runstate.json | **pending** | tasks.jsonl is sole source |
| Update all callers (CLI, inspect, retry, clean) | **pending** | |
| Migrate existing playbooks | **pending** | converge migrate --rfc=0037 |
| Tests | **pending** | Topology + execution parity |
| `pnpm build` | **pending** | TypeScript + DTS clean |

## Problem

After RFC 0031 (unified tasks.jsonl) and RFC 0034 (ban depends_on; auto-chain alphabetically), the execution model is **no longer a general-purpose DAG**. Dependencies are purely hierarchical (directory-level-based auto-chaining + parent→child spawn relationships). Yet the framework maintains a full DAG data structure (`TaskDag` with `DagNode`, `depends_on`, `depended_on_by`, `parents`, `children`, tag-based resolution, cycle detection, `_readyCache` invalidation) that:

1. **Is overkill.** The execution model is a sequence of levels, not an arbitrary DAG. Every pass does `getReady()` which scans all nodes — this is just computing the next level in a topo-sort.
2. **Duplicates state.** There are THREE writable surfaces for task identity and ordering:
   - `TaskDag.nodes` (in-memory graph with `depends_on`, `parents`, `children`, `spawned_children`)
   - `manifest.json` (serialized snapshot with `nodes`, `child_map`, `parent_map`)
   - `tasks.jsonl` (append-only ledger with `id`, `parent`, `depends_on`, `status`, `taskRef`, `params`)
   - Plus `runstate.json` (runtime status with `dag`, `metadata`, per-node `status`, `attempts`, `spawned_children`)
3. **Causes drift.** `syncLedgerToDag` runs repeatedly to pull spawned tasks from the ledger back into the DAG. `RunStateManager` merges prior `runstate.json` into a freshly-built DAG on resume. The resume path (`run/index.ts:540-650`) is 100+ lines of reconciliation logic that wouldn't exist with a single source.
4. **Makes bugs hard to trace.** The runner's outer loop (`run/index.ts:1150-1326`) has wave-based passes, seed-parent completion sweeps, convergence passthrough resets, incremental-seed loop continuations, stall detection, and max-iteration guards — all because the DAG model doesn't naturally express "run level N, then level N+1, repeat until all terminal."
5. **Spawns add runtime nodes mid-execution.** When a seed task spawns children, they're dynamically added to `TaskDag` via `syncLedgerToDag` mid-pass. The DAG must handle insertions during execution, invalidating caches and re-scanning readiness every iteration.

### The key insight

**After RFC 0034, execution order is fully determined by directory hierarchy + alphabetical ID sort.** This is a *topology of levels*, not an arbitrary DAG:

```
Level 0: 01-prepare (root)
Level 1: 02-design (depends on: 01-prepare)
Level 2: 03-build (depends on: 02-design)
Level 3: 04-test (depends on: 03-build)
```

Spawned children become **sub-levels** under their parent:

```
Level 2: 03-build (seed parent)
  Level 2a: build-screen-landing-03-react (spawned child, depends on: 03-build → seeded)
  Level 2b: build-screen-signup-03-react (spawned child, depends on: 03-build → seeded)
Level 3: 04-test (depends on: 03-build's children completing)
```

The current `tasks.jsonl` already captures this structure naturally:

```jsonl
{"kind":"playbook","name":"my-app","goals":[...]}
{"kind":"task","id":"01-prepare","goalId":"g1","parent":null,"depends_on":[],"status":"done"}
{"kind":"task","id":"02-design","goalId":"g1","parent":null,"depends_on":["01-prepare"],"status":"done"}
{"kind":"task","id":"screen-landing","goalId":"g2","parent":"03-build","depends_on":["03-build"],"source":"spawned","status":"todo"}
```

## Proposal

### Replace `TaskDag` with `TaskTopology`

**`TaskTopology`** is a simpler data structure that models the actual execution pattern:

```typescript
export interface TopologyLevel {
  /** Level index (0 = roots, 1 = depend on level 0, etc.) */
  index: number;
  /** Tasks in this level, ordered alphabetically by ID */
  tasks: TopologyTask[];
}

export interface TopologyTask {
  id: string;
  goalId: string;
  parent?: string;      // null for root-level tasks
  depends_on: string[]; // auto-wired from level ordering
  status: TaskRuntimeStatus;
  taskPath: string;
  taskRef?: TaskRef;
  params?: Record<string, unknown>;
  spawned_children?: string[];
  // Runtime fields
  fingerprint?: string;
  completedAt?: string;
  attemptCount?: number;
  durationMs?: number;
}

export class TaskTopology {
  levels: TopologyLevel[];
  playbookName: string;
  goals: PlaybookGoal[];

  /** Get all tasks ready to run in the current active level */
  getReady(): TopologyTask[];

  /** Mark a task complete; auto-advances level if all tasks in current level are terminal */
  markComplete(taskId: string): void;

  /** Mark a task failed; advances level so blockers can proceed */
  markFailed(taskId: string): void;

  /** Add spawned children as a sub-level */
  addSpawnedLevel(parentId: string, children: TopologyTask[]): void;

  /** Build from tasks.jsonl ledger */
  static fromLedger(ledgerPath: string): TaskTopology;
}
```

### What changes

#### 1. **Single source of truth: `tasks.jsonl`**

- `manifest.json` is **deleted**. The topology is built directly from `tasks.jsonl`.
- `runstate.json` is **deleted**. Runtime status lives in `tasks.jsonl` (already does — `status`, `fingerprint`, `completedAt`, `attemptCount` are all there).
- `TaskDag` class and `DagNode` interface are **deleted**.
- `RunStateManager` is **replaced** by a thin `TopologyStateManager` that reads/writes `tasks.jsonl` rows directly.

#### 2. **Simplified execution loop**

The current `runDag()` + `executeDag()` + outer wave loop (`run/index.ts:1150-1326`) becomes:

```typescript
async function runTopology(topology: TaskTopology, executeTask: (t: TopologyTask) => Promise<NodeResult>): Promise<RunResult> {
  for (const level of topology.levels) {
    for (const task of level.tasks) {
      if (task.status === 'done' || task.status === 'dropped') continue;

      // Seed parent: execute to spawn children, then wait for sub-level
      if (task.taskDef.mode === 'seed') {
        const result = await executeTask(task);
        if (result.spawnedChildren) {
          topology.addSpawnedLevel(task.id, result.spawnedChildren);
        }
        // Wait for all children in sub-level to complete
        await waitForSubLevel(topology, task.id, executeTask);
        task.status = 'done';
        continue;
      }

      // Normal task: execute directly
      const result = await executeTask(task);
      task.status = result.success ? 'done' : 'dropped';
    }
  }
  return collectResults(topology);
}
```

No more:
- `getReady()` scanning all nodes every iteration
- `_readyCache` invalidation
- `convergeSpawnerParents` sweeps
- `syncLedgerToDag` repeated calls
- `StuckRunnerError` with `noProgressStreak` detection
- `maxDagPasses` safety limits

#### 3. **Resume is trivial**

With tasks.jsonl as the single source, resume is just:

```typescript
const topology = TaskTopology.fromLedger(tasksJsonlPath);
// All tasks with status "done" are skipped; "todo" tasks run normally.
// No manifest.json to load, no runstate.json to merge, no DAG to reconcile.
```

#### 4. **Selection (--select) simplifies**

Instead of walking a DAG's dependency graph, selection filters levels:

```typescript
// --select "02-*" → find tasks matching glob, include all upstream levels
const selectedLevels = topology.filterLevels(taskId => matchesGlob(taskId, pattern));
```

### Code changes

#### Delete (or heavily simplify)

| File | Change |
|---|---|
| `packages/core/src/dag/task-dag.ts` | **Delete** — replaced by `TaskTopology` |
| `packages/core/src/dag/dag-node.ts` | **Delete** — replaced by `TopologyTask` |
| `packages/core/src/dag/topological-sort.ts` | **Delete** — levels are implicit |
| `packages/core/src/dag/dag-runner.ts` | **Delete** — replaced by `runTopology` |
| `packages/core/src/manifest/run-state-manager.ts` | **Replace** with `TopologyStateManager` (thin ledger wrapper) |
| `packages/core/src/manifest/build-dag.ts` | **Delete** — topology builds from ledger |
| `packages/core/src/manifest/types.ts` | **Simplify** — remove Manifest/ManifestNode/DagNodeMetadata |
| `packages/core/src/config/declarative-loader-unified.ts` | **Simplify** — build TaskTopology instead of TaskDag |
| `packages/core/src/config/declarative-loader.ts` | **Delete** — legacy loader, no longer needed |
| `packages/core/src/run/index.ts` | **Rewrite** — ~1800 lines → ~400 lines |

#### Create

| File | Purpose |
|---|---|
| `packages/core/src/topology/task-topology.ts` | TaskTopology class |
| `packages/core/src/topology/topology-task.ts` | TopologyTask interface |
| `packages/core/src/topology/level-builder.ts` | Build levels from tasks.jsonl |
| `packages/core/src/topology/run-topology.ts` | runTopology() execution loop |
| `packages/core/src/topology/state-manager.ts` | Thin wrapper over tasks.jsonl read/write |

#### Update (callers)

| File | Change |
|---|---|
| `packages/cli/src/commands-run.ts` | Use TaskTopology instead of TaskDag |
| `packages/cli/src/commands-inspect.ts` | Read from tasks.jsonl directly |
| `packages/cli/src/commands-tree.ts` | Render topology levels instead of DAG |
| `packages/cli/src/commands-retry.ts` | Reset tasks in ledger |
| `packages/cli/src/commands-compile.ts` | Build topology + validate |
| `packages/core/src/task/goal/runtime-ledger.ts` | Add level computation helper |
| `packages/core/src/navigator/repair/` | Work with TopologyTask instead of DagNode |

### Migration path

`converge migrate --rfc=0037` per playbook:

1. Read existing `manifest.json` (if present) to get current DAG shape.
2. Read `runstate.json` to get current task statuses.
3. Consolidate into `tasks.jsonl`: ensure every DAG node has a ledger row with correct `status`, `fingerprint`, `parent`, `depends_on`.
4. Delete `manifest.json` and `runstate.json`.
5. Validate: `converge compile` produces a valid TaskTopology with identical level ordering to the old DAG's topo-sort layers.
6. Run `converge run --dry-run` to verify task plan matches pre-migration behavior.

### What changes for users

- **Operators**: one less file to reason about. `.converge/journal/<playbook>/` contains only `tasks.jsonl` + `events.jsonl`. No more `manifest.json` / `runstate.json`.
- **Playbook authors**: no change to TASK.md authoring. Directory hierarchy still determines execution order.
- **AI**: `tasks.jsonl` append is the only write surface for dynamic task creation. No manifest updates.
- **CI**: `cat tasks.jsonl` shows the full execution plan with status. `jq` queries replace `converge inspect manifest`.

### Anti-goals

- **NOT** supporting arbitrary dependency graphs. If you need complex cross-level dependencies, restructure your playbook hierarchy.
- **NOT** changing the task execution contract (TASK.md format, skill invocation, agent spawning). This is purely an orchestration-layer simplification.
- **NOT** dropping the event journal. `events.jsonl` continues to record execution events for debugging and replay.
- **NOT** changing the ledger's append-only nature. tasks.jsonl remains append-only with upsert semantics.

## Verification

1. **Topology parity** — for each example playbook, the old DAG topo-sort layers and the new TaskTopology levels must produce identical execution order.
2. **Resume equivalence** — pre/post migration, `converge run --resume` must skip the same tasks and execute the same pending ones.
3. **Spawn behavior** — seed tasks that spawn children must produce identical sub-level ordering.
4. **Selection** — `--select` patterns must resolve to the same task sets.
5. **Build + tests** — `pnpm build && pnpm test` with no regressions.
6. **Simplification metric** — `packages/core/src/run/index.ts` must be <500 lines (currently ~2100).
7. **File count** — delete at least 5 files from the `dag/` and `manifest/` directories.

## Why now

RFC 0031 unified tasks into `tasks.jsonl`. RFC 0034 banned manual `depends_on` and auto-chained tasks alphabetically. These two changes fundamentally altered the dependency model: **execution order is now fully determined by directory hierarchy**, making the full DAG data structure unnecessary.

The current codebase carries ~2000 lines of DAG management, cycle detection, cache invalidation, and reconciliation logic for a model that is inherently sequential and level-based. Simplifying to `TaskTopology` eliminates this entire class of bugs (stuck runners, cache invalidation errors, resume drift) and makes the system easier to reason about, test, and maintain.
