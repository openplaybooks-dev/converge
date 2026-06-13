---
rfc: 0051
title: Durable flow state (`ctx.state` / `useState`)
status: accepted
created: 2026-06-13
supersedes: none
depends_on: 0050
---

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | This file |
| Tests (TDD) | **done** | `flow-runtime.test.ts` — durable KV, resume as-of reads, snapshot, useState |
| `ctx.state` KV API | **done** | `get`/`set`/`update`/`all` on `FlowContext` |
| `ctx.useState` sugar | **done** | `[value, setter]` for a single key |
| Inventory `state.jsonl` event log | **done** | Event-sourced, per-key write counter, replay-safe — under `inventory/<flow>/` |
| `state.json` snapshot projection | **done** | Last-write-wins view under `inventory/<flow>/` |
| `pnpm build` | **done** | TS + DTS clean |
| Docs (`workflow.md`) | **done** | New "Durable state" section |
| CHANGELOG | **done** | Added under Unreleased |

## Problem

A `workflow.js` (RFC 0050) is resumable mid-flight: every `task()`/`agent()`/`now()`
step is a journaled checkpoint that replays on resume. But there is no first-class
way to carry **state across steps** that is itself durable and resume-safe —
accumulated metadata, per-task durations, running notes, counters, a manifest the
flow builds up as it fans out.

Plain JS locals (`let total = 0`) work *within* one process, and they even survive
resume **if** every value derives from replayed step outputs — but they are invisible
to tooling, not inspectable on disk, and easy to get subtly wrong (a value derived
from `Date.now()` instead of a step output diverges on replay). Authors want an
explicit, durable, externally-readable place to read/write state.

## Goals

- Read/write arbitrary JSON state across a flow run: metadata, durations, notes, counters, manifests.
- **Durable**: state survives a crash and a `--resume`.
- **Resume-correct**: a `state.get` executed during the replayed prefix returns the value it had *at that point* in the original run, not the final value — so state may safely drive control flow.
- **Inspectable**: the current state is a plain JSON file that `inspect` / Studio / a human can read.
- Familiar ergonomics: a `ctx.state` KV API and a `ctx.useState(key, initial)` sugar.

## Non-goals

- Cross-*flow* shared state (this is scoped to one flow's journal).
- A reactive/subscription model — `useState` here is durable storage, not React rendering.
- Transactions / optimistic concurrency across `parallel` branches writing the *same* key (last-write-wins; documented).

## Design

### API

```ts
interface FlowState {
  get<T = unknown>(key: string, fallback?: T): T;
  set(key: string, value: unknown): void;
  update<T = unknown>(key: string, fn: (prev: T) => T, fallback?: T): void;
  all(): Record<string, unknown>;
}

interface FlowContext {
  // …existing…
  state: FlowState;
  useState<T>(key: string, initial?: T): [T, (value: T) => void];
}
```

`useState(key, initial)` returns `[state.get(key, initial), v => state.set(key, v)]`.

### Where it lives — the inventory layer, not the journal

State is stored under **`.converge/inventory/<flow>/`**, not the journal. This is
deliberate: the journal is *ephemeral execution evidence* (gitignored — `**/journal/**`),
while the inventory is the *committed, authoritative runtime state* (RFC 0033). Durable
flow state — the metadata/notes/durations/counters a flow accumulates — belongs with the
source of truth, so it survives across runs and is version-controllable. Storing it in the
journal would gitignore it away.

Two files, mirroring Converge's event-log + projection split (both in inventory):

- **`state.jsonl`** — append-only event log of writes (the durable record).
- **`state.json`** — last-write-wins snapshot (the read surface for `inspect` / Studio / humans), rewritten on each `set`.

### Durability & resume correctness

- Each `set(key, value)` appends a record to `state.jsonl`, keyed `<key>#<n>` where `n`
  is a **per-key write counter** (so the same key written twice is two records; two
  different keys never collide; the key is stable across replays because the flow body
  re-runs the same `set` calls in the same order).
- A live in-memory `Map<key,value>` is rebuilt by **re-applying writes in order as the
  flow replays.** On replay, a `set` whose `<key>#<n>` record already exists re-applies
  the *recorded* value to the map and skips the append (idempotent, bounded — no log
  growth across repeated resumes). A `set` past the resume frontier applies and appends
  fresh.

Because writes re-apply in order during replay, `state.get` reads taken in the replayed
prefix observe the correct **as-of** value. (Pre-folding the log to its final state on
load would break this — a prefix read would see the final value. Re-application is what
makes state safe to branch on.)

A fresh (non-resume) run resets `state.jsonl` to empty and the snapshot to `{}` (mirroring
the `steps.jsonl` truncation). `--dry` keeps state purely in memory — no log append, no
snapshot write.

### Concurrency

Writes from inside `parallel`/`pipeline` branches to *distinct* keys are safe (per-key
counters don't collide). Two branches writing the *same* key race — last-write-wins, the
same hazard plain shared mutable state has; documented, not prevented.

## Verification criteria

1. `set`/`get`/`update`/`all` round-trip within a run.
2. After a crash + `--resume`, state written before the crash is readable, and a
   `get` in the replayed prefix returns the as-of value (control-flow safe).
3. `state.json` reflects the final map and is valid JSON.
4. `useState` returns `[value, setter]` and the setter persists.
5. `pnpm build` + the flow suite stay green.
