---
rfc: 0013
title: Surgical reset with cascade semantics
status: draft
type: feat
source: human
priority_tier: tier2
estimate: "3-4 days"
backwards_compatible: yes
risk: medium
---
# RFC 0013: Surgical reset with cascade semantics

## Problem

In the baby-app run I ran `converge reset default 001-home-05-split` to recover from a fixed-template-vars issue. The runner advanced to other screens instead of re-spawning the home screen's split children. The semantics were unclear:

- Did reset clear just that task? Yes, but…
- Did it clear its dynamically-spawned children? Apparently no.
- Did downstream automatically pick up changes? Partially.

The result: I had to also delete some journal artifacts manually.

## Proposal

Two explicit modes for `converge reset`:

### `--cascade` (recommended default)

Reset task + all transitive descendants (including any tasks they spawned). Cleans up:
- The task's `attempts/` directory.
- Dynamically-spawned children's `TASK.md` and `attempts/`.
- Inventory entries for spawned children.
- Frontier entries for the task and its descendants.

### `--isolated`

Reset only the named task. Mark all descendants as `stale-input` (they exist but won't run until upstream re-converges). Use when you want to inspect intermediate state.

### Discovery helpers

```
$ converge reset default 001-home-05-split --dry-run
Would reset 7 tasks:
  - 001-home-05-split          (named target)
  - 001-home-06-lift           (descendant)
  - home-split-001-StatCard    (spawn child)
  - home-split-002-HeroCard    (spawn child)
  - home-lift-001-StatCard     (descendant + spawn child)
  - 03-build-screens           (parent, only its attempts cleared, not the task itself)
  - root-converge              (terminal, recomputed)
```

## Code-level design

- Identify descendants via the DAG + spawn-parent tracking.
- A new field `spawnedBy: <parent-task-id>` on dynamically-spawned tasks (already implicit in some events; make it explicit in inventory).
- Reset walks the dependency tree downstream.

## Implementation steps

1. Add `spawnedBy` field to inventory schema.
2. Implement transitive-descendants walk.
3. `--cascade` and `--isolated` flags on `converge reset`.
4. `--dry-run` flag listing affected tasks.
5. Update `converge-control` skill docs.

## Test plan

1. Reset a task with no spawn children → only that task cleared.
2. Reset a task with 6 spawn children → all 7 cleared (with `--cascade`).
3. `--isolated` → descendants marked stale-input but not deleted.
4. `--dry-run` → no side effects.

## Out of scope

- Bulk reset by selector (`--select 'tag:screen-home'`) — could come later.
- Auto-cascade based on file mtime (touch a TASK.md → cascade-reset its descendants) — RFC 0015 hot-reload territory.
