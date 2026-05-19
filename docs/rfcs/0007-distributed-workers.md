# RFC 0007: Distributed worker boundary

**Status**: Draft
**Backwards-compatible**: Yes (single-machine default unchanged)
**Estimate**: 3-4 weeks

## Problem

The orchestrator runs `Coordinator starting with 1 worker` — everything in-process. For thousands of tasks at 30s each, that's 42h serial. Eight parallel workers makes it 5h; thirty makes it 80 minutes.

## Proposal

Make the worker a separable process with a lease-based contract. The coordinator becomes a stateless dispatcher backed by the journal; workers connect, lease, run, and report.

```
                ┌──────────────┐
                │  Coordinator │
                │  (journal +  │
                │   frontier)  │
                └──┬───────┬───┘
                   │       │
              lease/report  │
                   │       │
        ┌──────────▼─┐ ┌───▼────────┐ ┌─────────────┐
        │  Worker 1  │ │  Worker 2  │ │  Worker N   │
        │  (local)   │ │  (remote)  │ │  (lambda)   │
        └────────────┘ └────────────┘ └─────────────┘
```

## Contract

Workers speak HTTP (or gRPC) to the coordinator:

```
POST /lease       → { taskId, taskMd, inputsTar, env, leaseUntil }   or 204 if no work
POST /heartbeat   { leaseId, progress: {...} }
POST /complete    { leaseId, outputsTar, events: [...], cost: {...} }
POST /defer       { leaseId, errorClass, retryAfterMs }
POST /fail        { leaseId, errorClass, reason }
```

The coordinator persists every event to the journal. Workers are stateless.

## Configuration

```yaml
# project.yml
workers:
  mode: local         # local | remote | hybrid
  local:
    count: 1          # default; can bump to N for in-process parallelism
  remote:
    listenOn: ":8723"
    auth: bearer
    leaseTimeoutMs: 600000
```

`converge worker` (new subcommand) starts a worker process pointing at a coordinator URL.

## Implementation steps (large; staged)

### Stage 1 (1 week): in-process parallelism
- Bump local-worker count above 1. The existing `parallelExecution: true` config exists at `packages/core/src/orchestrator/convergence.ts:39` but defaults to 1.
- Audit shared state for race conditions (journal writes, runstate updates).
- Smoke test with 8 in-process workers on a real playbook.

### Stage 2 (1 week): protocol design
- HTTP contract above.
- Lease semantics: timeout, renewal, idempotency on complete (worker can retry complete safely).
- Auth and TLS.

### Stage 3 (1-2 weeks): remote worker
- `converge worker --connect URL` subcommand.
- Sandboxing per-task (cd into a working dir, env from project.yml, mount inputs).
- Outputs streamed back via tar.

### Stage 4: extras
- Worker pool autoscaling.
- Region-aware dispatch (latency-sensitive providers).

## Test plan

1. Stage 1: run baby-app with 4 workers, assert correctness and ~3x speedup.
2. Stage 2: protocol unit tests (lease expiry, double-complete, etc).
3. Stage 3: spin up coordinator + 2 remote workers on localhost, run a playbook, assert journal coherence.
4. Chaos: kill a worker mid-task, assert lease times out and another worker picks it up.

## Out of scope

- Multi-coordinator HA.
- Cross-region replication of the journal.
- Workload-aware scheduling (cost minimization, latency optimization).
