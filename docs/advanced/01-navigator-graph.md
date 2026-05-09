---
title: "The navigator graph"
description: "How the convergence loop is structured. An event-sourced action graph that is its own checkpoint, not a switch statement with a retry counter."
sidebar:
  order: 1
---

## Most agent frameworks are switch statements with a retry loop

You've seen the shape. A `while` loop, a `try/catch`, a `MAX_RETRIES` constant. Each iteration calls the model, parses the response, runs a tool, and either succeeds or loops. State across iterations lives in the agent's prompt: "here's what you tried last time": and in some flat list of tool calls the framework keeps for context.

That works for short, single-task flows. It breaks for anything longer:

- **Crash recovery is opaque.** When the process dies mid-loop, the next start has no precise model of what was done. Either you replay everything (expensive, often non-idempotent), skip the whole task (lose progress), or reconstruct state from log scrapes (fragile).
- **Failure routing is implicit.** A failure inside the loop is a string in a `catch` block. There's no first-class data structure that says "we tried X, then Y failed, so we did Z." The history exists only in the agent's prompt: and the agent often loses it.
- **Stall detection is heuristic.** Did the agent thrash, or is it making progress? Counting failures gives the wrong answer when the agent fixes one check and breaks another. Without a structured record of *what* failed, you can't tell genuine progress from circular work.

The framework version of this conversation is: "we should track this in a real data structure." Converge does. The data structure is a graph.

## The graph

`packages/core/src/navigator/core/graph.ts` defines `NavigatorGraph` (line 11). It's the single source of truth for everything the runtime did. Two collections:

```typescript
export class NavigatorGraph implements Graph {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  // ...
}
```

A **node** is a planned or completed action: `detect-gaps`, `repair-loop`, `task-run`, `check-stall`. A node carries `id`, `handler`, `status` (`buffered` / `done` / `failed`), and an optional `data` payload describing what the action produced.

An **edge** records the sequence: `{from, to, iteration, ts}` (line 36). Every edge is timestamped. Order is derived from edge timestamps via `getExecutionOrder()` (lines 85–97), not from node insertion order or any implicit clock. This matters: nodes can be added in any order (preflight, response to gaps, postaction); the *executed* order is always the order edges were appended.

The whole thing is serializable to JSON via `toJSON()` (lines 103–116). Function-typed fields in `node.data` are stripped on serialization so the graph round-trips cleanly. `fromJSON()` (lines 118–126) reconstructs an identical instance.

## The graph IS the checkpoint

After every action runs, the navigator persists the graph to disk (see `packages/core/src/navigator/core/navigator.ts` around the `saveWalkerState` call site). That's not "the navigator periodically writes a checkpoint." It's "the data structure that defines current state is written after every step that mutates it." The graph and the checkpoint are the same artifact: the on-disk JSON is the in-memory `NavigatorGraph` minus its function payloads.

Crash recovery falls out for free. On resume:

1. Load the JSON from disk.
2. `NavigatorGraph.fromJSON(data)` reconstructs the graph.
3. `getBufferedNodes()` (line 49) returns the nodes that were planned but not yet executed.
4. The navigator picks the next one and runs it.

There is no "where were we when the process died?" question. The buffered nodes *are* where you were. The done nodes *are* what you completed. The edges *are* the order in which it happened.

## Reconstructable state

Because the graph carries the full history of executed actions, runtime state that other systems would track in volatile memory can be derived from a graph walk instead. `rebuildStateFromGraph()` in `navigator.ts` (around lines 117–134) walks the executed-node tail to recover:

- **Current gaps**: read from the data of the last `detect-gaps` node.
- **Stall count**: count consecutive `repair-loop` nodes whose response gaps match.
- **Previous gap snapshot**: for the stall detector to compare against current gaps.

None of this is held in instance variables that vanish on crash. It's all derivable from the on-disk graph. The implication: if the framework code itself changes (a refactor renames a handler, adds a new action), an existing graph stays correct as long as the handler IDs match. Recovery doesn't depend on the version of the code that wrote the checkpoint matching the version reading it.

## Why edges, not just nodes

A graph with only nodes can answer "what did we do?" but not "in what order?" Without ordering, you can't reason about consecutive states: and stall detection, JIT node injection, and post-action verification all depend on consecutive-state reasoning.

Edges give the order, but they're stored as a list (`GraphEdge[]`) rather than as parent/child pointers on the nodes themselves. That's a deliberate choice with two consequences:

1. **Adding an edge doesn't mutate any existing node.** The append is cheap, atomic at the array level, and easy to serialize.
2. **A node can be referenced by edges added at different cycles** without changing the node itself. When the navigator injects a `verify` node after a `task-run`, it appends an edge `task-run → verify`: the `task-run` node is read-only thereafter. No back-references to maintain.

The shape: append-only edge list over an idempotent node set: is the same shape Git uses for commit history: commits are immutable; relationships live in references and parents. Different domain, same payoff: you can reason about history without worrying that history mutates underneath you.

## What this looks like in practice

A small playbook with one task that fails its check once and recovers:

```
nodes:                              edges (in order):
  preflight#1   (done)              start → preflight#1
  task-load#1   (done)              preflight#1 → task-load#1
  task-run#1    (done)              task-load#1 → task-run#1
  detect-gaps#1 (done) → 1 gap      task-run#1 → detect-gaps#1
  repair-loop#1 (done)              detect-gaps#1 → repair-loop#1
  task-run#2    (done)              repair-loop#1 → task-run#2
  detect-gaps#2 (done) → 0 gaps     task-run#2 → detect-gaps#2
  verify#1      (done)              detect-gaps#2 → verify#1
```

That structure is the post-mortem, the checkpoint, and the runtime state: all the same thing. If the process died after `repair-loop#1`, the next start would resume at `task-run#2` (which would be the next buffered node).

## How this compares

The closest analogue is **event sourcing**. The graph is the event log; runtime state is a fold over the log. Some of the discipline is the same: append-only, derive don't store, recovery as replay-from-disk.

The difference is that traditional event sourcing typically separates the event log from the runtime state machine: the application layer derives state by replaying events, often into a separate database. Converge collapses the two: the graph *is* the runtime data structure the navigator works with directly. There's no derived projection. The navigator queries `getBufferedNodes()` against the same graph it serialized to disk.

The closer-to-home comparison is **React Fiber**. Fiber is also a tree of work units (fibers) with explicit traversal. It also pauses and resumes mid-render. But Fiber's pause/resume lives in process memory: when React crashes mid-render, the fiber tree is gone. Converge's equivalent of the fiber tree is on disk after every step. The "render unit" is much coarser (an action that takes seconds, not a component reconciliation that takes microseconds), which is what makes the per-step persistence affordable.

The third comparison is **build systems** like Bazel. Bazel persists the action graph between invocations to enable incremental builds. Converge does the same, for a different reason: Bazel re-runs only what changed; Converge resumes only what wasn't done. Same machinery, different question.

## When this matters for your work

You won't notice the navigator graph when a 5-task playbook runs to completion in 90 seconds. You'll notice it when:

- **A 6-hour playbook gets killed at hour 4.** With the graph as checkpoint, `converge run --resume` continues at the next buffered node: not from the start, not from the last task boundary, but from the exact action that was about to run.
- **You need to audit a run.** The graph is a complete record. `cat .converge/journal/<playbook>/walker-state.json | jq '.nodes'` is a straight-line answer to "what did the framework actually do?"
- **A framework upgrade lands mid-run.** As long as the new code knows the same handler IDs, the existing graph resumes against the new code path. Recovery doesn't care about framework version.

If your runs are short and unconditional, you don't need this. If your runs are long, conditional, or production, this is the foundation that makes resumption a real feature instead of a marketing claim.

## Where this lives

- `packages/core/src/navigator/core/graph.ts`: `NavigatorGraph` class (line 11), `getExecutionOrder` (line 85), `toJSON`/`fromJSON` (lines 103–126).
- `packages/core/src/navigator/core/types.ts`: `Graph`, `GraphNode`, `GraphEdge`, `NodeStatus` interfaces.
- `packages/core/src/navigator/core/navigator.ts`: the loop that reads from and writes to the graph; `rebuildStateFromGraph` around lines 117–134.

For the next layer up: *how* nodes are added to the graph (and why they're added on-demand, not pre-built): see [Just-in-time graph construction](./02-jit-graph-construction).
