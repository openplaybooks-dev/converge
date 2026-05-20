---
rfc: 0027
title: Output-overlap concurrency guard
status: draft
type: feat
source: human
priority_tier: tier1
estimate: "2-3 days"
backwards_compatible: yes
risk: medium
breaks_existing: no
---
# RFC 0027: Output-overlap concurrency guard

## Problem

The coordinator's worker pool (`packages/core/src/run/index.ts`) dispatches any task with `status: "ready"` to any free worker. There is no consideration of *what files the tasks declare they will write*. Two tasks whose `outputs:` overlap can be running on different workers at the same time, racing on file edits.

Concrete case observed in `mezon-bot-ai` mezon-portal on 2026-05-20:

- 19 screens × 7 steps = 133 per-screen spawned children.
- Steps 03-react through 07-wire all declare `apps/portal/src/routes` as output.
- With `workers: 4`, the coordinator dispatched `screen-landing-04-components`, `screen-login-04-components`, `screen-chat-04-components`, and `screen-bots-list-04-components` simultaneously. All four LLMs called `Edit` on files in `apps/portal/src/routes/`. Last write wins; earlier edits got clobbered.

The author worked around this by setting `workers: 1` in `playbook.yml` — slow but safe. The framework had every signal needed to do better: it sees declared outputs, it controls dispatch.

## Proposal

Treat the union of every running task's declared `outputs:` as a set of held locks. A `ready` task is dispatchable iff its declared outputs do not intersect any currently-running task's outputs. Otherwise the task waits in the queue until the overlap clears.

This is a soft lock — based on declared paths, not OS-level fcntl. Authors must declare what they write; the framework trusts those declarations. Tasks that write to undeclared paths can still race, but that's a separate (and pre-existing) class of bug already discouraged by the cache predicate and Section 6 of CLAUDE.md.

### Algorithm

When the coordinator picks the next `ready` task for an idle worker (`packages/core/src/run/index.ts` scheduling loop):

1. Compute the **outputs lockset** — union of `outputs:` across all currently-running tasks (`status === "running"`).
2. For each candidate `ready` task in priority order:
   - Compute its declared outputs after substitution.
   - If any of its outputs **prefix-overlaps** any path in the lockset, skip.
   - Otherwise dispatch.
3. If no `ready` task is dispatchable, return idle (the worker waits).

### Prefix-overlap semantics

Two paths overlap when one is a prefix of the other (path-component-aware, not raw string prefix). Examples:

| Path A | Path B | Overlap |
|---|---|---|
| `apps/portal/src/routes` | `apps/portal/src/routes/login.tsx` | yes (A is dir prefix of B) |
| `apps/portal/src/routes` | `apps/portal/src/routes` | yes (identical) |
| `apps/portal/src/features/landing` | `apps/portal/src/features/chat` | no (siblings) |
| `apps/portal/src/routes` | `apps/portal/src/components` | no (different subtree) |

Implementation: normalise each path with `path.posix.normalize`, split on `/`, compare component-wise. Two paths overlap if one is a path-prefix of the other (component-wise, not character-wise).

### Output

The reporter emits a structured event when a task waits on overlap:

```json
{
  "kind": "log",
  "level": "info",
  "message": "scheduling: screen-chat-04-components waiting on apps/portal/src/routes held by screen-landing-04-components"
}
```

This gives operators visibility into "why isn't worker 3 doing anything?" without burying the signal in debug logs.

### Opt-out

Some pipelines have legitimate concurrent writes — e.g. each task appending to a separate line of a JSONL log under a shared dir, or each writing to its own per-task file under a shared parent. Per-task opt-out:

```yaml
# TASK.md frontmatter
concurrency:
  output_lock: false    # opt out of this task's outputs participating in the lockset
```

Default: `output_lock: true` (the safe default).

This is per-task, not per-output. If a task writes to one shared directory it's serialising on, plus one per-task file, it can declare both outputs and accept that the shared dir serialises.

## Composition with other RFCs

| RFC | Relationship |
|---|---|
| **0026 (sibling-output collision detector)** | 0026 catches the design mistake of N siblings declaring the same outputs at apply time; 0027 catches the runtime race even if 0026 missed it (e.g. dynamic outputs that only collide at runtime). |
| **0007 (distributed workers)** | The lockset must work across workers on different processes. The MVP uses an in-process Set; the distributed extension promotes it to a Redis-backed structure or file-lock per output. |
| **playbook.yml `run.workers`** | Honoured as an upper bound on parallelism. The overlap guard reduces effective parallelism per-output-set. A run with `workers: 8` and 19 perfectly-disjoint-output spawned children still gets 8-way parallelism; one with all-overlapping outputs collapses to 1-way regardless of `workers:`. |

## Code-level design

### New module: `packages/core/src/coordinator/output-lockset.ts`

```ts
export class OutputLockset {
  /** Track outputs held by currently-running tasks. */
  private held = new Map<string, Set<string>>(); // taskId → outputs

  acquire(taskId: string, outputs: string[]): void;
  release(taskId: string): void;
  /** Returns the first held path that overlaps any of `candidate`, or null. */
  conflictsWith(candidate: string[]): { conflictPath: string; heldBy: string } | null;
}

export function pathsOverlap(a: string, b: string): boolean;
```

### Hook into coordinator

In the main scheduling loop, before dispatching a `ready` task to a worker, call `lockset.conflictsWith(task.outputs)`. On non-null, defer; on null, `lockset.acquire(task.id, task.outputs)` then dispatch.

On task completion (regardless of pass/fail), `lockset.release(task.id)`.

### Tests

1. **Unit**: `pathsOverlap` against the table above.
2. **Unit**: `OutputLockset.acquire` + `conflictsWith` returns the expected conflict for prefix-overlapping outputs.
3. **Integration**: 3 tasks declaring `apps/x/dir`, `apps/x/dir/a.tsx`, `apps/x/other`. Workers=3. Assert only one of the first two runs at a time, the third runs concurrently with either.

## Anti-goals

- **Not** OS-level file locks. Declared-paths only. Tasks that write to undeclared paths bypass the guard — that's a different bug.
- **Not** dependency inference. The framework already has `depends_on:` for explicit ordering; this guard is for tasks the author *intended* to run in parallel that happen to clash.
- **Not** changing the meaning of `workers:`. Workers is still the parallelism cap; this guard just makes effective parallelism never exceed what's safe.

## Why now

mezon-portal forced `workers: 1` for an entire 133-child playbook because of one overlapping-output pattern. With this guard, the same playbook could run `workers: 4` and parallelise across screens (the per-screen `features/{{screenId}}/` paths don't overlap) while still serialising step-03-react's shared `routes/` writes. Likely 3–4× faster end-to-end on multi-screen playbooks.
