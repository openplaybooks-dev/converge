# RDC Pattern: Diverge → Children → Converge

## What is RDC?

RDC (Resonance–Divergence–Convergence) is the playbook execution pattern where a **parent task** fans out work to children, waits for them to complete, then converges the results.

```
                    ┌─────────────┐
                    │  DIVERGE     │  ← parent task runs, decides what to spawn
                    │  (seed)      │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ child-1  │  │ child-2  │  │ child-N  │  ← children run (parallel or sequential)
      └────┬─────┘  └────┬─────┘  └────┬─────┘
           │             │             │
           └─────────────┼─────────────┘
                         ▼
                    ┌─────────────┐
                    │  CONVERGE   │  ← parent body runs after ALL children done
                    └─────────────┘
```

## Current DAG Implementation

### How it works today

The framework splits every **container task** (a task with static children) into two nodes:

```typescript
// build-dag.ts:splitContainerNodes()
// Input:  container task "03-build-screens" with children [screen-a, screen-b, screen-c]
// Output:
//   "03-build-screens-diverge"  — type: "diverge", runs FIRST
//   "03-build-screens-converge" — type: "converge", runs AFTER children

// Edge wiring:
//   children.depends_on = ["03-build-screens-diverge"]  // children wait for diverge
//   converge.depends_on = ["screen-a", "screen-b", "screen-c"]  // converge waits for ALL children
//   downstream.depends_on = ["03-build-screens-converge"]  // next tasks wait for converge
```

Plus bookend root nodes:

```typescript
// build-dag.ts:injectRootNodes()
//   "root-diverge"  — entry point, no deps, runs first
//   "root-converge" — exit point, depends on all terminal tasks
```

### The problem: Converge can't re-spawn missing work

The current DAG has a **single-shot** converge model:

1. Diverge runs once → spawns children
2. Children run
3. Converge waits for children → runs body → done

**What if converge detects gaps?** What if 3 out of 5 children completed successfully but 2 failed, or the converge body determines "I need more data — spawn 3 more children"?

Today this is handled by a **hacky outer loop** in `run/index.ts`:

```typescript
// Lines 1170-1326: the runner's outer while(true) loop
while (true) {
  // Pre-pass: mark seed parents complete if all children terminal
  convergeSpawnerParents(dag)

  // Execute the DAG pass
  { completed, failed } = executeDagWithWorkers(dag, ...)

  // Post-pass: sweep again for seed parents that just became completable
  convergeSpawnerParents(dag)

  // Re-queue incremental seed parents that want another cycle
  for (node of dag.nodes) {
    if (isIncrementalSeedNotDone(node)) {
      // Reset node to pending → will run again next iteration
      dag.resetToPending(node.id)
    }
    if (isQueueNotConverged(node)) {
      dag.resetToPending(node.id)
    }
  }

  // Stall detection
  if (no progress) { consecutiveStalls++; if (tooMany) break; }
}
```

This works but is **fragile**:
- The outer loop compensates for the DAG not modeling multi-wave execution natively
- `syncLedgerToDag` is called 5+ times to pull newly-spawned children into the DAG mid-execution
- Status mutations (`dag.resetToPending`, `dag.markComplete`) happen during execution, invalidating caches
- 26 `catch { /* swallow */ }` blocks hide failures in this reconciliation logic

## RDC Check: Is the pattern correct?

### ✅ Diverge → Children → Converge IS correct

The **concept** is sound. A parent task should:
1. **Diverge**: analyze, plan, spawn children
2. **Children**: do the work in parallel
3. **Converge**: review results, detect gaps, decide whether more work is needed

### ❌ Single-shot converge is wrong

The converge phase should be **iterative**, not terminal. If convergence detects gaps, it should be able to:
- Re-spawn children for missing work
- Re-converge after the new children complete
- Only terminate when convergence is truly satisfied

### The topology model handles this BETTER

Under RFC 0037's topology model (keep the DAG, fix the implementation), the RDC pattern maps cleanly:

```
Level 0: root-diverge
Level 1: 01-requirements (depends on root-diverge)
Level 2: 02-design (depends on 01-requirements)
Level 3: 03-build-diverge (depends on 02-design)
Level 3a: 03-build-child-screen-a (spawned sub-level, depends on diverge)
Level 3a: 03-build-child-screen-b (spawned sub-level, depends on diverge)
Level 3a: 03-build-child-screen-c (spawned sub-level, depends on diverge)
Level 4: 03-build-converge (depends on ALL level-3a children)
Level 5: 04-test (depends on converge)
Level 6: root-converge (depends on 04-test)
```

**Key difference**: The topology rebuilds from `tasks.jsonl` before each pass. When converge spawns new children:

1. Converge body appends new rows to `tasks.jsonl` (already happens via `appendTaskUpsert`)
2. Next pass: `buildDagFromLedger()` picks up the new rows
3. New children form a new sub-level under the converge task
4. Converge waits for the new sub-level before completing

No mid-execution DAG mutations. No `syncLedgerToDag`. No cache invalidation. The ledger is the source; the topology is a fresh read view each pass.

### Multi-wave converge pattern

For `mode: converger` tasks (the existing multi-wave loop), the topology model simplifies to:

```
Pass N:  converge task runs → writes spawn.plan.jsonl → halt check says "not done"
         → new child rows in tasks.jsonl
Pass N+1: topology rebuilds with new children as sub-level
         → converge task sees children pending → waits
         → children complete
         → converge runs again → halt check says "done"
         → converge marks itself complete
```

This is cleaner than the current `wave.counter` file-based persistence because:
- **tasks.jsonl is the persistence layer** (already append-only, already mtime-cached)
- **No file-based wave counter** — the ledger rows encode wave membership
- **Crash recovery is free** — next run rebuilds from ledger, sees pending children

## RDC Checklist for Playbook Authors

When designing a playbook with diverge-converge patterns, verify:

### Diverge Phase
- [ ] Parent task has a clear `mode: spawner` or seed contract
- [ ] Children are defined under the parent's directory: `tasks/03-build/001-screen-a/TASK.md`
- [ ] Each child has declared `outputs:` (required for convergence validation)
- [ ] Children are independent (no cross-child dependencies)

### Converge Phase
- [ ] Converge task declares all children as `depends_on` (auto-wired by directory order)
- [ ] Converge body validates **all** children's outputs exist
- [ ] Converge has a halt condition: either `converge.halt_when` checks or a `halt.marker` file
- [ ] If convergence can re-spawn, the body appends to `tasks.jsonl` and returns `_incrementalSeedNotDone: true`

### Gap Recovery (Re-spawn)
- [ ] Converge detects missing/incomplete work
- [ ] New child rows appended to `tasks.jsonl` with `parent: "<converge-task-id>"`
- [ ] Converge resets itself to pending (via `ctx.loop.continue()` or `_incrementalSeedNotDone`)
- [ ] Next pass picks up new children automatically (no DAG mutation needed)

## Proposed RDC Topology Structure

```typescript
interface RdcTopology {
  levels: RdcLevel[];
}

interface RdcLevel {
  index: number;                    // 0, 1, 2, ...
  type: 'root' | 'normal' | 'sub'; // sub = spawned children of a diverge
  parentId?: string;                // for sub-levels: which diverge task spawned these
  tasks: Task[];
}

interface Task {
  id: string;
  status: 'todo' | 'doing' | 'done' | 'failed';
  taskPath: string;                 // path to TASK.md
  taskRef?: { kind: 'static' | 'template'; name: string };
  params?: Record<string, unknown>;
  outputs: string[];
  mode?: 'normal' | 'spawner' | 'converger' | 'seed';
  // Runtime-only (not persisted to tasks.jsonl)
  _incrementalSeedNotDone?: boolean;
  _queueNotConverged?: boolean;
}
```

### Execution

```typescript
async function runRdcTopology(topology: RdcTopology): Promise<RunResult> {
  for (let pass = 1; pass <= maxPasses; pass++) {
    // Rebuild topology from tasks.jsonl (picks up any new spawned children)
    topology = buildRdcTopologyFromLedger(tasksJsonlPath);

    if (allTasksTerminal(topology)) break;

    for (const level of topology.levels) {
      if (level.type === 'sub') {
        // Sub-level: wait for parent diverge to be "seeded"
        const parent = findTaskById(topology, level.parentId!);
        if (parent?.status !== 'seeded' && parent?.status !== 'done') continue;
      }

      for (const task of level.tasks) {
        if (task.status !== 'todo') continue;
        await executeTask(task);

        if (task.mode === 'converger') {
          // Converger may re-spawn children → new rows in tasks.jsonl
          // The next pass will pick them up as a new sub-level
          if (task._incrementalSeedNotDone) {
            // Reset converger for next wave
            task.status = 'todo';
          }
        }
      }
    }
  }
}
```

## Summary

| Aspect | Current DAG | Topology (RFC 0037) |
|---|---|---|
| Diverge → Children → Converge | ✅ Works (splitContainerNodes) | ✅ Works (sub-levels) |
| Converge re-spawning | ⚠️ Hacky (outer loop + syncLedgerToDag) | ✅ Clean (rebuild from ledger) |
| State surfaces | ❌ 4 (TaskDag, manifest.json, runstate.json, tasks.jsonl) | ✅ 1 (tasks.jsonl) |
| Mid-execution mutations | ❌ DAG mutated during run | ✅ DAG immutable per pass |
| Crash recovery | ⚠️ Merge 3 sources | ✅ Rebuild from ledger |
| Code complexity | ❌ 2100 lines in run/index.ts | ✅ ~300 lines |
| Silent error swallowing | ❌ 26 catch blocks | ✅ <5, all logged |

**Conclusion**: The RDC pattern is correct. The topology model is a better fit for multi-wave converge with re-spawning because it treats `tasks.jsonl` as the single source and rebuilds the execution graph fresh each pass — no mid-execution mutations, no reconciliation, no drift.
