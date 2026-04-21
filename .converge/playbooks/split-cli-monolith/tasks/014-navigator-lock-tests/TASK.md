---
id: 014-navigator-lock-tests
title: PR14 — Behavior-locking tests for repair/navigator
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 014-navigator-lock-tests
  title: PR14 — Behavior-locking tests for repair/navigator
  tier: C
  task: Safety net for the navigator extraction — lock current converge() / NavigatorGraph / predicate / JIT-injection behavior before any moves.
  spec: "Add vitest suites under `packages/core/tests/repair/navigator/` that run green against the current `packages/core/src/repair/navigator/*` layout. These are the regression net for PR15 and PR16.\n\n**Scope of what exists today** (ground-truth audit — counts may shift before the PR runs, re-grep):\n\n| File | LOC | Public shape |\n| --- | --- | --- |\n| `navigator.ts` | ~476 | `converge(opts): Promise<ConvergeResult>` — main per-iteration loop |\n| `actions.ts` | ~1236 | `buildActionRegistry(): Map<string, ActionHandler>` — 20 domain-specific handlers (repair-loop, run-strategy, detect-gaps, verify, signal-done, check-wbs-seeded, check-outputs-exist, advance-attempt, check-stall, start-new-cycle, …) |\n| `graph.ts` | ~127 | `class NavigatorGraph implements Graph` with `addNode`, `getNode`, `getBufferedNodes`, `getNodesByHandler`, `lastExecuted`, `getLastN`, `toJSON`, `fromJSON` |\n| `types.ts` | ~130 | `Snapshot`, `GraphNode`, `GraphEdge`, `Graph`, `WalkResult`, `ActionHandler`, `GoalCondition` |\n| `default-graph.ts` | ~173 | `buildPreflightNodes`, `buildResponseNodes`, `buildPostActionNodes` — JIT node builders (repair-specific) |\n| `task-context.ts` | ~180 | `TaskContext`, `WalkerState` — JSON-serializable persistence |\n| `predicates.ts` | ~113 | `evalPredicate(name, snap)`, `listPredicates()`, predicate registry |\n\n**Single entry point in consumers:** `Unit.run()` in `packages/core/src/unit/run.ts` is the only external caller of `converge()`. No CLI code imports the navigator directly.\n\n**Suites to add** (test behavior, not line numbers):\n\n| Target area | Test | What to lock |\n| --- | --- | --- |\n| `graph.ts` | graph-basics.test.ts | addNode → status \"buffered\" by default; getBufferedNodes returns buffered only; toJSON/fromJSON round-trip preserves nodes, edges, statuses |\n| `graph.ts` | graph-query.test.ts | getNodesByHandler filters by handler name; lastExecuted returns most-recent \"done\" node; getLastN returns N most-recent in order |\n| `predicates.ts` | predicates.test.ts | evalPredicate with registered name returns bool; unknown predicate → default (document current behavior: throw or false); listPredicates returns full registry |\n| `task-context.ts` | task-context-persistence.test.ts | WalkerState round-trip (serialize + parse) preserves graph state; TaskContext merges with new snapshot correctly |\n| `default-graph.ts` | jit-injection.test.ts | buildPreflightNodes returns the 4 seed nodes; buildResponseNodes(unit, gaps) returns one handler node per gap-type match; buildPostActionNodes returns verify + check-stall + advance-attempt |\n| `navigator.ts` | converge-loop.test.ts | With stub action registry: loop selects first applicable buffered node; handler's WalkResult.action=\"continue\" injects response nodes; action=\"done\" exits; action=\"bail\" exits; maxActions halts the loop |\n| `navigator.ts` | converge-events.test.ts | Each iteration emits a structured event (capture via injected/current event writer); event sequence matches exact expected order for a scripted scenario |\n| `actions.ts` | action-registry-shape.test.ts | buildActionRegistry() returns Map with exact set of 20 expected handler names; each handler is a function of arity 2 |\n\n**Design rule:** every test must drive `converge()` or `NavigatorGraph` via their **current import paths** (`../../src/repair/navigator/...`). PR16 updates those paths to `@converge/navigator`; if the suites break on only the import line change, the extraction succeeded behaviorally.\n\n**Fixtures:** a minimal fake `Unit` + fake `Gap[]` + in-memory `TaskContext`. Do not stand up real executors or real strategies — those are integration concerns covered elsewhere.\n\n**Acceptance:**\n- `pnpm --filter @converge/core test tests/repair/navigator` green\n- Each suite runs in <1s (no real LLM calls, no real disk I/O outside temp)\n- Coverage report shows every public export in `graph.ts`, `predicates.ts`, `task-context.ts`, `default-graph.ts`, and the main loop branches of `navigator.ts` exercised"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\014-navigator-lock-tests"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR14 — Behavior-locking tests for repair/navigator

**Tier:** C

**Summary:** Safety net for the navigator extraction — lock current converge() / NavigatorGraph / predicate / JIT-injection behavior before any moves.

## Full specification

Add vitest suites under `packages/core/tests/repair/navigator/` that run green against the current `packages/core/src/repair/navigator/*` layout. These are the regression net for PR15 and PR16.

**Scope of what exists today** (ground-truth audit — counts may shift before the PR runs, re-grep):

| File | LOC | Public shape |
| --- | --- | --- |
| `navigator.ts` | ~476 | `converge(opts): Promise<ConvergeResult>` — main per-iteration loop |
| `actions.ts` | ~1236 | `buildActionRegistry(): Map<string, ActionHandler>` — 20 domain-specific handlers (repair-loop, run-strategy, detect-gaps, verify, signal-done, check-wbs-seeded, check-outputs-exist, advance-attempt, check-stall, start-new-cycle, …) |
| `graph.ts` | ~127 | `class NavigatorGraph implements Graph` with `addNode`, `getNode`, `getBufferedNodes`, `getNodesByHandler`, `lastExecuted`, `getLastN`, `toJSON`, `fromJSON` |
| `types.ts` | ~130 | `Snapshot`, `GraphNode`, `GraphEdge`, `Graph`, `WalkResult`, `ActionHandler`, `GoalCondition` |
| `default-graph.ts` | ~173 | `buildPreflightNodes`, `buildResponseNodes`, `buildPostActionNodes` — JIT node builders (repair-specific) |
| `task-context.ts` | ~180 | `TaskContext`, `WalkerState` — JSON-serializable persistence |
| `predicates.ts` | ~113 | `evalPredicate(name, snap)`, `listPredicates()`, predicate registry |

**Single entry point in consumers:** `Unit.run()` in `packages/core/src/unit/run.ts` is the only external caller of `converge()`. No CLI code imports the navigator directly.

**Suites to add** (test behavior, not line numbers):

| Target area | Test | What to lock |
| --- | --- | --- |
| `graph.ts` | graph-basics.test.ts | addNode → status "buffered" by default; getBufferedNodes returns buffered only; toJSON/fromJSON round-trip preserves nodes, edges, statuses |
| `graph.ts` | graph-query.test.ts | getNodesByHandler filters by handler name; lastExecuted returns most-recent "done" node; getLastN returns N most-recent in order |
| `predicates.ts` | predicates.test.ts | evalPredicate with registered name returns bool; unknown predicate → default (document current behavior: throw or false); listPredicates returns full registry |
| `task-context.ts` | task-context-persistence.test.ts | WalkerState round-trip (serialize + parse) preserves graph state; TaskContext merges with new snapshot correctly |
| `default-graph.ts` | jit-injection.test.ts | buildPreflightNodes returns the 4 seed nodes; buildResponseNodes(unit, gaps) returns one handler node per gap-type match; buildPostActionNodes returns verify + check-stall + advance-attempt |
| `navigator.ts` | converge-loop.test.ts | With stub action registry: loop selects first applicable buffered node; handler's WalkResult.action="continue" injects response nodes; action="done" exits; action="bail" exits; maxActions halts the loop |
| `navigator.ts` | converge-events.test.ts | Each iteration emits a structured event (capture via injected/current event writer); event sequence matches exact expected order for a scripted scenario |
| `actions.ts` | action-registry-shape.test.ts | buildActionRegistry() returns Map with exact set of 20 expected handler names; each handler is a function of arity 2 |

**Design rule:** every test must drive `converge()` or `NavigatorGraph` via their **current import paths** (`../../src/repair/navigator/...`). PR16 updates those paths to `@converge/navigator`; if the suites break on only the import line change, the extraction succeeded behaviorally.

**Fixtures:** a minimal fake `Unit` + fake `Gap[]` + in-memory `TaskContext`. Do not stand up real executors or real strategies — those are integration concerns covered elsewhere.

**Acceptance:**
- `pnpm --filter @converge/core test tests/repair/navigator` green
- Each suite runs in <1s (no real LLM calls, no real disk I/O outside temp)
- Coverage report shows every public export in `graph.ts`, `predicates.ts`, `task-context.ts`, `default-graph.ts`, and the main loop branches of `navigator.ts` exercised

---

Runs the full pipeline: **analyze → implement → review → quality**.
