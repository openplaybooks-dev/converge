---
rfc: 0033
title: Unified Orchestration & Worker Model
status: withdrawn
type: feat
source: human
priority_tier: tier0
estimate: "6-8 weeks"
backwards_compatible: no
risk: high
replaces: ["0007-distributed-workers"]
---

# RFC 0033: Unified Orchestration & Worker Model

## Problem Statement

Converge's execution pipeline has grown organically across multiple modules,
creating overlapping responsibilities, weak API boundaries, and predictable
failure modes at scale:

### 1. Memory Leaks from Unbounded State Accumulation

The `AgentManager` singleton (`packages/core/src/agents/agent-manager.ts`)
maintains in-memory process registries (`agentsByPid`, `agentsBySession`) that
grow monotonically. Dead processes are never pruned from these maps except
during explicit `cleanupDeadProcesses()` calls, which are only triggered by
shutdown handlers. Mid-run, orphaned entries accumulate.

The `ConvergenceOrchestrator` holds references to `GapDetector`,
`ConvergenceAnalyzer`, `FilesystemStorage`, `StatusManager`, and `HookRegistry`
— none of which release references when tasks complete.

The `run()` function in `packages/core/src/run/index.ts` captures `dag`,
`resultsMgr`, `checkpointMgr`, `executionLogger`, and `reporter` in closures
that persist across all DAG passes.

### 2. Leftover Background Templates

Task spawning (`spawn-runner.ts`, `loop-executor.ts`, `task-executor.ts`)
creates child TASK.md files and journal entries that persist on disk. When a
task fails or is interrupted, these children may remain in `pending` state with
no parent to complete them. The `convergeSpawnerParents` sweep only completes
parents whose children are all terminal — it doesn't clean orphans.

The `AgentManager`'s state file (`~/.converge/agent-registry.json`) accumulates
process records across runs with no TTL or cleanup policy beyond manual
`cleanupOrphans()`.

### 3. Process Violations (Concurrency Race Conditions)

`runDag()` in `dag-runner.ts` supports `concurrency > 1` and runs ready nodes
via `Promise.all()`, but:

- Journal writes (`writeTaskStatus`, `writeTaskTodo`, `logTaskEvent`) are not
  serialized. Concurrent tasks writing to overlapping journal paths can corrupt
  state.
- `process.env.CONVERGE_*` variables are set per-task in `runTask()` (lines
  1529-1535) but `process.env` is process-global. Two tasks running in parallel
  will overwrite each other's environment, breaking any child process that reads
  these vars mid-execution.
- The `RunStateManager` is shared across all workers without mutex protection.
  `markRunning()`, `markComplete()`, `markFailed()` can interleave, producing
  inconsistent runstate.

### 4. Failed Process Locking

The `run-lock.ts` mechanism uses a file-based lock with PID + UUID validation.
But:

- `stopRun()` uses `pkill -f journal/${playbookName}/` which is a regex match
  on cmdline — it can kill unrelated processes whose arguments happen to contain
  the pattern.
- If the locking process crashes without releasing (no `beforeExit` fire on
  SIGKILL), the lock file persists. The next run sees a dead PID and acquires
  the lock, but any mid-flight agent processes from the dead run continue
  writing to the same journal.
- The `AgentCleanup` signal handlers (`SIGINT`, `SIGTERM`, `beforeExit`,
  `uncaughtException`, `unhandledRejection`) each call `shutdownAll()` which
  sends SIGTERM then SIGKILL to all tracked processes. But `AgentManager` tracks
  processes registered via `AgentManager.register()`, and not all spawned agents
  go through that path (e.g., `agentfn()` calls in `spawn-runner.ts`).

### 5. No Clear Worker Abstraction

Currently "workers" are just string IDs (`local-1`, `local-2`, ...) assigned to
`Promise.all` chunks. There's no:

- Worker process isolation (all tasks share the same Node.js process)
- Worker health monitoring (a hung task blocks its "slot" forever)
- Worker resource accounting (memory, CPU, time per worker)
- Lease timeout enforcement (a task can hold a lease indefinitely)
- Worker lifecycle (start, stop, restart, drain)

## Proposed Solution: Unified Execution Model

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Coordinator                           │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────┐ │
│  │ DAG       │  │ Lease     │  │ State Machine          │ │
│  │ Compiler  │──│ Manager   │──│ (Task→Worker→Journal) │ │
│  │           │  │           │  │                       │ │
│  └──────────┘  └─────┬─────┘  └───────────┬───────────┘ │
│                      │                    │             │
│              ┌───────┴───────┐            │             │
│              │  Worker Pool  │◄───────────┘             │
│              │  (isolated)   │                          │
│              └───────┬───────┘                          │
│                      │                                  │
│              ┌───────┴───────┐                          │
│              │  Task Runner  │  (per-worker process)    │
│              └───────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### 1. Worker Process Isolation

Replace in-process `Promise.all` parallelism with real process isolation:

```typescript
// Each worker is a child Node.js process with its own event loop,
// memory space, and environment.
interface Worker {
  id: string;
  pid: number;
  status: 'idle' | 'busy' | 'draining' | 'dead';
  lease?: { taskId: string; expiresAt: number; leaseId: string };
  process: ChildProcess;
  messagePort: MessageChannel;
}
```

**Why processes, not threads:** Node.js is single-threaded per event loop.
`Promise.all` in the same process means a CPU-bound LLM call blocks the event
loop for all other "workers." Real process isolation gives each worker its own
event loop, its own `process.env`, and crash containment (one worker dying
doesn't take down the coordinator).

**Communication:** Use `MessageChannel` (Node.js worker_threads) or stdio JSON
protocol for task assignment, progress reporting, and result collection. The
protocol is identical for local and remote workers (RFC 0007's HTTP contract
becomes the remote transport).

### 2. Lease-Based Task Dispatch

Replace the ad-hoc "assign from ready set" pattern with explicit leases:

```typescript
interface Lease {
  leaseId: string;      // UUID
  taskId: string;
  workerId: string;
  grantedAt: number;    // ms epoch
  expiresAt: number;    // ms epoch
  heartbeatAt: number;  // ms epoch (last heartbeat)
}

interface LeaseManager {
  /** Claim a task for a worker. Returns null if no work available. */
  acquire(workerId: string, maxLeaseMs: number): Lease | null;

  /** Worker reports progress, extending its lease. */
  heartbeat(leaseId: string): boolean;

  /** Worker reports completion. */
  complete(leaseId: string, result: TaskResult): void;

  /** Worker reports failure. */
  fail(leaseId: string, error: Error): void;

  /** Reclaim expired leases (called by coordinator timer). */
  reclaimExpired(): Lease[];

  /** Drain a worker: cancel its lease, don't assign new work. */
  drainWorker(workerId: string): void;
}
```

**Lease lifecycle:**
1. Coordinator calls `acquire()` → returns lease with `expiresAt` = `now + timeout`
2. Worker processes the task, sending periodic `heartbeat()` calls
3. On completion/failure, worker calls `complete()`/`fail()` → lease released
4. If `expiresAt` passes without completion or heartbeat, coordinator reclaims
   the lease, marks the task as `pending` (retryable), and can assign it to
   another worker

**This eliminates:**
- Hung tasks blocking forever (lease expires)
- Lost work on worker crash (lease reclaim + retry)
- Double-execution (lease is exclusive; only one worker holds it)

### 3. Unified State Machine

Replace the scattered state tracking across `DagNode.status`, `RunStateManager`,
`StatusManager`, `TaskStateManager`, and `AgentManager` with a single
authoritative state machine:

```typescript
type TaskState =
  | 'pending'       // Not yet scheduled
  | 'queued'        // In the ready set, waiting for a worker
  | 'leased'        // Assigned to a worker (lease active)
  | 'running'       // Worker executing
  | 'heartbeat'     // Worker sent progress update
  | 'completing'    // Worker finished, persisting results
  | 'complete'      // Terminal — succeeded
  | 'failed'        // Terminal — exhausted retries
  | 'cancelled'     // Terminal — operator cancelled
  | 'orphaned';     // Terminal — parent failed/removed, never ran

type WorkerState =
  | 'starting'      // Process launching
  | 'idle'          // Ready for work
  | 'busy'          // Holding a lease
  | 'draining'      // Finishing current lease, then stopping
  | 'dead'          // Process exited unexpectedly
  | 'stopped';      // Intentionally shut down
```

All state transitions are recorded in the journal as structured events. The
state machine validates transitions — invalid transitions throw immediately
rather than producing inconsistent state.

**Key invariant:** A task can only be in `leased`/`running` state if a live
worker holds an active lease for it. When the worker dies or the lease expires,
the task transitions back to `queued`.

### 4. Process Supervision with Guaranteed Cleanup

Replace `AgentManager` with a proper process supervisor:

```typescript
interface ProcessSupervisor {
  /** Spawn a task in an isolated worker process. */
  spawn(opts: WorkerSpawnOpts): Promise<Worker>;

  /** Gracefully stop a worker (SIGTERM → timeout → SIGKILL). */
  stop(workerId: string, opts?: { timeoutMs?: number }): Promise<void>;

  /** Stop all workers and clean up. */
  shutdownAll(opts?: { timeoutMs?: number }): Promise<void>;

  /** Detect and clean up orphaned processes from previous runs. */
  cleanupOrphans(playbookName: string): Promise<number>;

  /** Check health of all workers. */
  healthCheck(): Map<string, WorkerHealth>;
}
```

**Supervision guarantees:**
- Every worker process is tracked by the supervisor
- The supervisor owns the process lifecycle (start, monitor, stop, cleanup)
- On coordinator shutdown, all workers are gracefully terminated
- On coordinator crash, a `cleanupOrphans()` call on next startup finds and
  terminates leftover processes using a combination of:
  - PID file (stored in journal with coordinator PID)
  - Process group (workers are spawned in their own process group)
  - Journal state reconciliation (any `leased` task from a dead coordinator
    is reclaimed)

**Implementation:** Workers are spawned via `child_process.fork()` with their own
`process.env` scope. The coordinator communicates via IPC channels. Each worker
runs the existing `executeTask()` pipeline but with its own isolated environment.

### 5. Eliminate `process.env` Global Race

Replace the per-task `process.env` mutation in `runTask()`:

```typescript
// Before (broken — global mutation races):
process.env.CONVERGE_CURRENT_TASK_PATH = `.../${taskId}`;
process.env.CONVERGE_WORKER_ID = workerId;
process.env.CONVERGE_TASK_DIR = abs;

// After (passed via execution context):
const taskEnv = {
  CONVERGE_CURRENT_TASK_PATH: `.../${taskId}`,
  CONVERGE_WORKER_ID: workerId,
  CONVERGE_TASK_DIR: abs,
};
// Passed to the executor, not mutated on process.env
const result = await executeTask(unit, checkpointMgr, executionLogger, {
  syncSpawnedToDag,
  taskEnv,  // isolated per task
});
```

For worker processes, each gets its own `process.env` naturally. For in-process
execution (single worker, dev mode), the task environment is passed as a
parameter to the executor rather than mutating the global.

### 6. Journal-Backed State Persistence

Replace the scattered state files with a single authoritative journal:

```
.converge/journal/<playbook>/
├── state/
│   ├── tasks.jsonl        # Task state transitions (append-only)
│   ├── workers.jsonl      # Worker lifecycle events (append-only)
│   └── leases.jsonl       # Lease grant/complete/expire events (append-only)
├── events/
│   └── active.jsonl       # Existing event stream (unchanged)
└── manifest.json          # Current runstate (derived, not authoritative)
```

The `tasks.jsonl` format:
```jsonl
{"ts":"2026-05-21T...","taskId":"03-build-screens","from":"pending","to":"leased","workerId":"local-1","leaseId":"uuid-..."}
{"ts":"2026-05-21T...","taskId":"03-build-screens","from":"leased","to":"running","workerId":"local-1","leaseId":"uuid-..."}
{"ts":"2026-05-21T...","taskId":"03-build-screens","from":"running","to":"complete","workerId":"local-1","leaseId":"uuid-...","durationMs":45000}
```

**Why append-only:** The journal is the source of truth. `manifest.json` is a
derived snapshot for fast reads. On resume, the coordinator replays the journal
to reconstruct state — no risk of partial writes or corruption.

### 7. Stuck Detection & Recovery

The current `StuckRunnerError` in `dag-runner.ts` detects when `getReady()`
returns the same set repeatedly. This is preserved but enhanced:

```typescript
interface StuckDetector {
  /** Called each DAG pass. Throws StuckRunnerError if no progress. */
  recordPass(ready: DagNode[], completed: number, failed: number): void;

  /** Called when a task transitions to terminal state. */
  recordCompletion(taskId: string): void;

  /** Reset the detector (e.g., after spawning new children). */
  reset(): void;
}
```

Additionally, a **watchdog timer** monitors individual worker leases. If a lease
expires without heartbeat or completion, the worker is considered hung and is
force-killed, with the task re-queued for retry.

## Migration Path

### Phase 1 (Week 1-2): State Machine + Lease Abstraction

- Define `TaskState` and `WorkerState` enums
- Implement `LeaseManager` interface
- Wrap the existing `executeDagWithWorkers()` to use leases internally
- No behavior change — just structured dispatch

### Phase 2 (Week 3-4): Process Supervisor

- Implement `ProcessSupervisor` using `child_process.fork()`
- Migrate `AgentManager` to use supervisor instead of registry
- Add guaranteed cleanup on coordinator shutdown
- Add `cleanupOrphans()` for stale process recovery

### Phase 3 (Week 5-6): Worker Process Isolation

- Spawn workers as child processes
- Eliminate `process.env` global mutation
- Implement IPC protocol for task dispatch/results
- Add lease timeout and heartbeat enforcement

### Phase 4 (Week 7-8): Journal-Backed Persistence

- Implement append-only `tasks.jsonl`, `workers.jsonl`, `leases.jsonl`
- Derive `manifest.json` from journal on each write
- Add resume from journal replay
- Deprecate direct `runstate.json` mutations

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Memory growth during 100-task run | Unbounded (AgentManager leaks) | <50MB overhead |
| Orphaned processes after crash | Common (no cleanup) | Zero |
| Concurrent task env races | Present (process.env mutation) | Eliminated |
| Lease timeout enforcement | None | <60s detection |
| Stuck task recovery | Manual (operator intervenes) | Automatic (lease reclaim + retry) |
| State consistency on resume | Fragile (multiple files) | Guaranteed (journal replay) |

## Lessons from Industry

- **Temporal.io**: Lease-based task assignment with heartbeat timeouts. A task
  that stops heartbeating is automatically reassigned. This is the model we
  adopt.
- **Celery**: Worker process pools with result backends. Workers are isolated
  processes; the broker (Redis/RabbitMQ) dispatches tasks. Our coordinator plays
  the broker role.
- **dbt**: Node-level caching and `--state` reuse. We keep our existing
  fingerprint-based caching but move it to the lease manager.
- **Kubernetes controllers**: Reconcile loop — the desired state is declared,
  the controller converges reality to match. Our DAG + lease model follows this
  pattern: the DAG declares what needs to run, the lease manager ensures tasks
  are assigned, the supervisor ensures workers execute.
- **Nomad**: Process supervision with guaranteed cleanup. Nomad tracks every
  allocation and ensures cleanup on node failure. Our supervisor provides the
  same guarantee at the process level.

## Out of Scope

- Multi-coordinator HA (the coordinator is still a single process)
- Cross-region worker dispatch (workers are still local or connected via HTTP)
- Workload-aware scheduling (cost minimization, GPU affinity)
- Replacing the existing DAG topology algorithm (only the dispatch layer changes)
