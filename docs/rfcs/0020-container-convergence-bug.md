# RFC 0020: Container convergence detection — fix infinite re-lease loop

**Status**: Draft (BUG; high priority)
**Backwards-compatible**: Yes (bug fix)
**Estimate**: 1-2 days

## Problem

Observed during a real baby-app run (May 2026): containers with `seed: { mode: cli }` whose children completed successfully **never recognize convergence** and re-lease themselves in a tight loop. Two containers (`002-browse-05-split` and `012-article-reader-05-split`) reached **9061 and 9062 attempts** respectively over ~2.5 hours, while their children were all `status: complete` on disk and their declared outputs (e.g., `lib/screens/browse/_widgets/LinkCard.dart`) existed.

Symptom in the run.log:

```
[worker:local-1] leased 002-browse-05-split (002-browse-05-split-lease-8981)
   Attempt #8981 → journal/default/tasks/002-browse-05-split/attempts/wip
   📖 Parsing TASK.md: ...
🎬 Starting: Split: Browse
   └─ Inputs: 1  Outputs: 1
✅ Pre-flight: Seed already seeded (1 tasks) — skipping re-execution
✅ Seed seeded — waiting for children
   [seed] spawned 1 child: browse-split-001-LinkCard
   📦 Container re-queued for assembly: 002-browse-05-split
[worker:local-1] leased 002-browse-05-split (lease-8982)
   ...repeats indefinitely...
```

`browse-split-001-LinkCard`'s checkpoint says `"status":"complete","completedAt":"2026-05-19T03:07:10.225Z"`. The container should have converged at 03:07:10. At 05:38 it's still re-leasing.

Meanwhile the same code path works for 10 of 12 other `*-05-split` containers in the same playbook — they all show `status: seeded, attempts: 1`. So the bug is **conditional** on something: perhaps timing, perhaps a specific child-task shape, perhaps an event-ordering race.

## Hypotheses

1. **Event-loss race**: the container observes "children spawned" and re-queues for assembly, but the child's TASK_EXECUTION_COMPLETE event is lost or ordered after the re-queue → on re-lease it sees children as still pending → re-queue again.
2. **Output-glob mismatch**: container declares `outputs: lib/screens/browse/_widgets/**/*.dart`. The actual file is `lib/screens/browse/_widgets/LinkCard.dart`. The glob should match. Maybe the matcher resolves the glob at compile time vs lease time differently.
3. **Pre-flight short-circuit**: the "Seed already seeded — skipping re-execution" path doesn't recompute the container's done predicate; it always re-queues for assembly.
4. **Stuck `wip` attempt directory**: the wip dir from attempt #1 was never moved to `attempts/1/`, so each attempt is "new" from the runner's POV. Worth checking: does `attempts/wip` get incremented or does it linger?

## Investigation steps before fix

1. Read `packages/core/src/orchestrator/convergence.ts` and find the "container re-queued for assembly" path.
2. Walk through what triggers the re-queue and what should break the loop.
3. Examine the `events.jsonl` for `002-browse-05-split` around 03:07:10 to see whether the child-complete event is recorded for the container and what the container's reaction is.
4. Confirm whether `lib/screens/browse/_widgets/LinkCard.dart` would satisfy the container's output check (`find lib/screens/browse/_widgets -name '*.dart'` returns 1).

## Likely fix shapes

### Fix A: Add a max-attempts guard to container re-queues

Right now the container re-queues without bound. Add `maxAssemblyRetries: 50` (configurable in `project.yml`). After this, mark the container `failed` with errorClass `authoring` so RFC 0003 fails the run fast instead of burning hours.

This is a band-aid — it doesn't fix the underlying bug but prevents 9000-attempt loops.

### Fix B: Re-check declared outputs on container assembly

When a container is being re-queued, before incrementing attempt count:
1. Check if the container's declared outputs exist on disk.
2. If yes, check if all known children are `status: complete`.
3. If yes, mark the container `done` directly without another lease.

### Fix C: Event-ordering invariant

Ensure the child's TASK_EXECUTION_COMPLETE event is fsync'd before the container is allowed to re-evaluate. Likely requires journal-write barriers.

## Recommended order

1. **Diagnose** by reading the orchestrator code paths (~half a day).
2. **Fix A (guard)** to stop the bleeding (~half a day).
3. **Fix B (eager check)** as the proper fix (~1 day).
4. **Add a regression test** that creates a 1-child container, waits for child completion, asserts container converges within 5 attempts.

## Test plan

Add a synthetic playbook fixture:

```
container:
  - 1 child template
  - child writes a single file
  - container's outputs: that file
```

Run end-to-end. Assert container `status: complete` within 10 attempts.

Also: replay the recorded baby-app journal up to the bug point and assert the fixed container converges instead of looping.

## Related

- This bug **broke a real production-like run** in a way none of the existing RFCs would catch. RFC 0011 (live dashboard) would have surfaced the 9000-attempt anomaly visually. RFC 0003 (error classification) with a runaway-detection clause would mark this `authoring` and abort. But the actual fix needs to happen in the orchestrator.
- Worth elevating to **priority above RFCs 0001-0003** since it's actively breaking runs.
