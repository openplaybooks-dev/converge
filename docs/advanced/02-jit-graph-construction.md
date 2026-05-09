---
title: "Just-in-time graph construction"
description: "The navigator graph isn't pre-built. Nodes are injected on-demand as gaps appear, keeping the runtime traceable instead of letting it explode combinatorially."
sidebar:
  order: 2
---

## The pre-declared-graph problem

The first instinct when you decide to model a workflow as a graph is to build the graph upfront. Declare every node, declare every edge, hand the structure to a runtime that walks it.

It works for static pipelines. It breaks for everything else, in two ways.

**Combinatorial explosion.** If a task can fail in N ways and each way needs M repair strategies, the pre-built graph has N×M response branches per task. Multiply across phases. Multiply again across the cycles a single task might go through before passing. The pre-built graph balloons before any work starts. Most of it will never execute.

**Dead branches as noise.** When you do execute, the graph is full of branches the runtime never took. Auditing "what actually happened" means filtering. Tooling around the graph (visualization, debugging) carries the dead weight too. The map and the territory diverge.

The alternative is JIT: just-in-time: graph construction. Start with a small set of seed nodes. Inject new nodes only when the runtime sees a condition that needs them. The graph that exists is exactly the graph that ran.

## How Converge does it

Three injection points in `packages/core/src/navigator/core/navigator.ts`. They run at different moments and add different kinds of nodes.

### 1. Pre-flight nodes: at startup

When the navigator starts a task (or resumes mid-run), it seeds a small fixed set of pre-flight nodes:

```typescript
// navigator.ts, line 237
const initialNodes = buildPreflightNodes(unit);
for (const node of initialNodes) {
  graph.addNode(node);
}
```

These are the actions every task needs before any real work runs: load the unit, snapshot inputs, detect existing gaps. They're the same for every task, so they're built up front from a fixed builder. No injection logic, no surprises.

### 2. Response nodes: when gaps appear

The interesting injection happens inside the main loop. After each action runs, the navigator checks whether that action surfaced new gaps. If it did, response nodes get injected immediately:

```typescript
// navigator.ts, lines 416–427
const cycleSuffix = cycle > 1 ? `#${cycle}` : "";
if (result.gaps && result.gaps.length > 0) {
  const responseNodes = buildResponseNodes(unit, result.gaps, cycle);
  for (const node of responseNodes) {
    graph.addNode({
      ...node,
      id: `${node.id}${cycleSuffix}`,
      ...(cycleSuffix ? { origin: "reactive" as const } : {}),
    });
  }
}
```

`buildResponseNodes(unit, gaps, cycle)` is a function of the *actual* gaps the runtime saw. Three output gaps + one blocker + one check-failed → five repair nodes injected. Zero gaps → zero injection. The graph stays exactly as wide as the work in flight.

The `cycleSuffix` matters. The same task can go through multiple cycles (initial run → repair → re-run → re-detect). Without a suffix, the second cycle's `repair-loop` node would have the same ID as the first cycle's, and `addNode` (which is idempotent: see `graph.ts:20`) would silently drop the new one. With the suffix, each cycle gets its own response nodes, edges, and traceable history.

### 3. Post-action nodes: after a response node completes

After a non-preflight, non-postaction handler runs, the navigator injects the verification suite:

```typescript
// navigator.ts, lines 429–448
const PREFLIGHT_AND_POST = new Set([
  "check-seed-seeded",
  "check-outputs-exist",
  "detect-gaps",
  "signal-done",
  "verify",
  "check-stall",
  "advance-attempt",
]);
if (!PREFLIGHT_AND_POST.has(handlerName)) {
  const postNodes = buildPostActionNodes();
  for (const node of postNodes) {
    graph.addNode({
      ...node,
      id: `${node.id}${cycleSuffix}`,
      ...(cycleSuffix ? { origin: "reactive" as const } : {}),
    });
  }
}
```

`verify`, `check-stall`, `advance-attempt` only appear after a real action ran. If the runtime never executes a task (because all checks already pass on initial detection), there's no verify node injected. The graph reflects the actual control flow, not all possible control flows.

The `PREFLIGHT_AND_POST` exclusion is the loop-safety bit: pre-flight and post-action handlers don't trigger more post-action injections of themselves. Without it, every `verify` would inject another `verify`, which would inject another, until the buffered set blew up.

## What this buys you

**The graph is a faithful record.** The on-disk graph after a run is exactly the actions that ran. There are no unexecuted branches to filter when auditing. `cat walker-state.json | jq '.nodes | length'` is the action count, not "the action count plus a bunch of dead structure."

**The runtime has no global plan to consult.** When picking what to do next, the navigator queries `getBufferedNodes()` (graph.ts:49) and chooses among them. There's no "lookup what node is supposed to come after this in the master plan": there is no master plan. The next action is whatever was injected and is still buffered. This is what makes JIT robust: the planner doesn't need to anticipate every path through the runtime, because there is no anticipation. There is just response.

**Failures and successes use the same machinery.** A successful action injects post-action verification nodes; a failing action that surfaces gaps injects repair nodes. There's no separate happy-path graph and unhappy-path graph. Both are just appends in response to runtime conditions. The control flow comes out of which conditions hold at which moment.

**Cycle isolation is cheap.** The `cycleSuffix` trick means each retry cycle has its own copy of the response nodes: but the *same* underlying handlers. The graph carries the history of all cycles in one structure, not as parallel trees. Debugging "what did cycle 2 do differently from cycle 1?" is reading two slices of the same node list, filtered by the suffix.

## What this gives up

JIT graph construction is an explicit choice to give up upfront planning. There is no point at which you can ask "what is the plan for this task?": only "what has the plan turned out to be?" or "what is the plan right now?"

For tasks where the work is data-dependent (most agent tasks), this is the right tradeoff: the runtime can't anticipate the plan because the plan depends on what files exist, what checks pass, what gaps surface. For tasks with rigid, fully knowable shape, JIT is overkill: you'd be better off with a static DAG executor. But Converge isn't optimizing for that case. The premise of the framework is that work is conditional; JIT graph construction is what makes the navigator honest about that.

## How this compares

Closest analogue: **Redux middleware that intercepts actions and dispatches derived side effects.** A reducer doesn't pre-declare every possible follow-on action; middleware looks at what came through and dispatches more if needed. Converge's response and post-action injection is the same shape: the runtime sees an action's result and decides whether to add more nodes.

The difference: Redux's history is a flat action log; Converge's is a graph with edges. That lets Converge reason about *consecutive states* (this gap appeared after that gap was supposed to be fixed → stall) in a way a flat log can't, because the log doesn't carry the structural relationship between the two events.

A second comparison: **React's lazy reconciliation.** React doesn't render every possible state of every component upfront: it renders what's needed, when state changes warrant it. Converge does the same at a coarser granularity: the action, not the component. The navigator only injects nodes that current state warrants.

Both Redux and React are about user-facing UI; Converge applies the same shape to runtime control flow. The discipline is the same: don't build what you don't know you need; respond to what the runtime actually sees.

## Where this lives

- `packages/core/src/navigator/core/navigator.ts`: the JIT injection sites: pre-flight at line 237, response nodes at lines 416–427, post-action nodes at lines 429–448.
- `packages/core/src/navigator/core/actions/index.ts` (and the `actions/` subdirectories under it): the handler implementations that the navigator dispatches to. `buildResponseNodes` and `buildPostActionNodes` are exported from the actions registry.
- `packages/core/src/navigator/core/graph.ts:20`: `addNode` is idempotent, which is what makes the cycleSuffix discipline possible. Without idempotence, retries would either re-add nodes (corrupting the graph) or throw (forcing the navigator to track which nodes already exist).

For the next layer: how the framework decides what counts as a "gap" in the first place, by snapshotting filesystem state and diffing it: see [Input snapshot and file diff](./03-input-snapshot-and-diff).
