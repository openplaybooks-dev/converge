---
id: 016-extract-navigator-pkg
title: "PR16 — Extract @converge/navigator workspace package"
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 016-extract-navigator-pkg
  title: "PR16 — Extract @converge/navigator workspace package"
  tier: C
  task: AI-driven reactive navigator as a standalone package. Drives plugged-in handlers/scenarios through a JIT-buffered node graph. Zero deps.
  spec: "Create `packages/navigator/` workspace package — the reactive engine that PR15 isolated. Core plugs its 20 repair handlers into this engine; a future agent-authoring UI can plug in its own handlers.\n\n## Concept\n\n`@converge/navigator` is the **driver** for AI-influenced reactive flows:\n\n- **Graph of nodes.** Each node is a handler reference — work to be executed when the node becomes applicable.\n- **Just-in-time buffered.** The full graph is never pre-seeded. Handlers return `WalkResult`s that buffer new nodes in response to state (gaps detected, post-action triggers, stall events). The graph grows lazily as the scenario unfolds.\n- **Reactive.** Each iteration the engine picks the next buffered node whose predicate is currently applicable against the live snapshot. State transitions are driven by what handlers observe and enqueue, not a pre-wired state machine.\n- **AI enters through handlers.** The engine is deterministic; the *handlers* it dispatches can be AI-driven (call an LLM, pick a strategy, invoke a skill). The AI shapes the traversal by choosing what to buffer next, not by being baked into the engine.\n\nThis matches the current repair loop: gaps → repair-loop handler (calls AI-ranked strategy selection) → run-strategy handler → verify → either done or new gaps → repeat.\n\n## Source (from PR15 layout)\n\n- `packages/core/src/repair/navigator/graph.ts` → `packages/navigator/src/graph.ts`\n- `packages/core/src/repair/navigator/types.ts` → `packages/navigator/src/types.ts`\n- `packages/core/src/repair/navigator/navigator.ts` → `packages/navigator/src/navigator.ts`\n- `packages/core/src/repair/navigator/predicates.ts` → `packages/navigator/src/predicates.ts`\n- `packages/core/src/repair/navigator/task-context.ts` → `packages/navigator/src/task-context.ts`\n- `packages/core/src/repair/navigator/index.ts` → `packages/navigator/src/index.ts`\n- PR14 tests move to `packages/navigator/tests/`\n\n## Package shape\n\n```\npackages/navigator/\n  package.json           # name: @converge/navigator, deps: {} (zero)\n  tsconfig.json\n  tsup.config.ts\n  vitest.config.ts\n  src/\n    index.ts             # barrel\n    graph.ts\n    types.ts\n    navigator.ts\n    predicates.ts\n    task-context.ts\n  tests/\n    graph-basics.test.ts\n    graph-query.test.ts\n    predicates.test.ts\n    task-context-persistence.test.ts\n    jit-injection.test.ts    # NOTE: this one tests a repair-specific file — stays in core, see below\n    converge-loop.test.ts\n    converge-events.test.ts\n```\n\n## Exports\n\n```ts\n// Engine entry\nexport { converge } from './navigator';\nexport type { ConvergeOptions, ConvergeResult } from './navigator';\n\n// Graph\nexport { NavigatorGraph } from './graph';\nexport type { Graph, GraphNode, GraphEdge, NodeStatus } from './types';\n\n// Handler contract\nexport type { ActionHandler, WalkResult, WalkAction, Snapshot, GoalCondition } from './types';\n\n// Predicate registry (extensible)\nexport { evalPredicate, registerPredicate, listPredicates } from './predicates';\n\n// Persistence\nexport { TaskContext } from './task-context';\nexport type { WalkerState } from './task-context';\n\n// Event contract (injected, not provided)\nexport type { EventSink, NavigatorEvent } from './types';\n```\n\n## Dependencies\n\n**Target: zero runtime deps.** The engine is pure TypeScript — no journal, no filesystem, no logging framework. Everything domain-specific is plugged in by the consumer:\n\n- **Handlers:** consumer passes `Map<string, ActionHandler>` via `ConvergeOptions.actions`.\n- **Node builders (JIT injection strategies):** consumer passes preflight/response/post-action builder callbacks via `ConvergeOptions.nodeBuilders`. (Currently repair's `default-graph.ts` — stays in core as a repair strategy.)\n- **Event logging:** consumer passes an `EventSink` (PR15 introduced this); journal backing lives in core.\n- **Predicate registry:** ships with a minimal built-in set; consumers call `registerPredicate(name, fn)` to extend.\n\nIf anything in `packages/navigator/src/` imports filesystem APIs, path APIs, or any `@converge/*` package, that's a layering violation — refactor to an injected callback.\n\n## Core side\n\n- `packages/core/package.json` adds `\"@converge/navigator\": \"workspace:*\"`\n- `packages/core/src/repair/navigator/` directory **deleted**\n- `packages/core/src/repair/default-graph.ts` **stays** (repair's node-builder strategy — plugged into `converge()` by `Unit.run()`)\n- `packages/core/src/repair/actions/` **stays** (repair's handler registry — plugged into `converge()` by `Unit.run()`)\n- `packages/core/src/unit/run.ts` updates imports:\n  ```ts\n  import { converge } from '@converge/navigator';\n  import { buildRepairActionRegistry } from '../repair/actions';\n  import { buildPreflightNodes, buildResponseNodes, buildPostActionNodes } from '../repair/default-graph';\n  import { journalEventSink } from '../journal/navigator-sink';  // thin adapter\n  ```\n\n## Layering invariants (hard REJECT on violation)\n\n1. **Zero deps:** `packages/navigator/package.json` `dependencies` is empty or absent.\n2. **No @converge/* imports in engine:**\n   ```bash\n   grep -rn \"@converge/\" packages/navigator/src && exit 1 || true\n   ```\n3. **No filesystem/IO primitives:**\n   ```bash\n   grep -rn \"from ['\\\"]\\(fs\\|fs/promises\\|path\\|os\\|process\\)['\\\"]\" packages/navigator/src && exit 1 || true\n   ```\n   (`process` allowed only if used for `process.hrtime` or `process.env` — but prefer none.)\n4. **No CLI/display leakage** (same rule as elsewhere):\n   ```bash\n   grep -rn \"@converge/display\\|@converge/cli\\|console\\.\\(log\\|error\\)\\|process\\.exit\" packages/navigator/src | grep -v \".test.ts\" && exit 1 || true\n   ```\n5. **EventSink is an interface, not a concrete logger:** `grep -n \"class.*EventSink\\|new.*EventSink\" packages/navigator/src` → zero hits.\n\n## Downstream verification\n\n- `Unit.run()` still drives a repair scenario end-to-end (integration test)\n- swebench + tbench still pass (they use `Unit.run()` through `@converge/core`)\n- Navigator package tests pass in isolation (`pnpm --filter @converge/navigator test`) with zero dependencies installed — proves containment\n\n## Acceptance\n\n- All 5 layering audits pass\n- `pnpm -r build` + `pnpm -r test` green across all packages\n- `packages/navigator/` has zero runtime deps\n- PR14 behavior-locking suites pass unchanged (only import paths updated to `@converge/navigator`)\n- Repair integration test (fixture gap → strategy → resolved) passes end-to-end\n\n## Out of scope (future PRs, explicitly not this one)\n\n- Making `Snapshot` fully generic (`Snapshot<TState, TTrigger>`). Current shape keeps `unit` and `gaps` fields typed as `unknown` or via structural interfaces; full genericization is a follow-up that lets web/UI consumers define their own state + trigger types.\n- Alternative graph backends (SQLite-backed, distributed). Keep in-memory + JSON persistence only.\n- Built-in LLM-calling handlers. The engine stays AI-agnostic; handlers decide whether/how to call AI."
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\016-extract-navigator-pkg"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR16 — Extract @converge/navigator workspace package

**Tier:** C

**Summary:** AI-driven reactive navigator as a standalone package. Drives plugged-in handlers/scenarios through a JIT-buffered node graph. Zero deps.

## Full specification

Create `packages/navigator/` workspace package — the reactive engine that PR15 isolated. Core plugs its 20 repair handlers into this engine; a future agent-authoring UI can plug in its own handlers.

## Concept

`@converge/navigator` is the **driver** for AI-influenced reactive flows:

- **Graph of nodes.** Each node is a handler reference — work to be executed when the node becomes applicable.
- **Just-in-time buffered.** The full graph is never pre-seeded. Handlers return `WalkResult`s that buffer new nodes in response to state (gaps detected, post-action triggers, stall events). The graph grows lazily as the scenario unfolds.
- **Reactive.** Each iteration the engine picks the next buffered node whose predicate is currently applicable against the live snapshot. State transitions are driven by what handlers observe and enqueue, not a pre-wired state machine.
- **AI enters through handlers.** The engine is deterministic; the *handlers* it dispatches can be AI-driven (call an LLM, pick a strategy, invoke a skill). The AI shapes the traversal by choosing what to buffer next, not by being baked into the engine.

This matches the current repair loop: gaps → repair-loop handler (calls AI-ranked strategy selection) → run-strategy handler → verify → either done or new gaps → repeat.

## Source (from PR15 layout)

- `packages/core/src/repair/navigator/graph.ts` → `packages/navigator/src/graph.ts`
- `packages/core/src/repair/navigator/types.ts` → `packages/navigator/src/types.ts`
- `packages/core/src/repair/navigator/navigator.ts` → `packages/navigator/src/navigator.ts`
- `packages/core/src/repair/navigator/predicates.ts` → `packages/navigator/src/predicates.ts`
- `packages/core/src/repair/navigator/task-context.ts` → `packages/navigator/src/task-context.ts`
- `packages/core/src/repair/navigator/index.ts` → `packages/navigator/src/index.ts`
- PR14 tests move to `packages/navigator/tests/`

## Package shape

```
packages/navigator/
  package.json           # name: @converge/navigator, deps: {} (zero)
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  src/
    index.ts             # barrel
    graph.ts
    types.ts
    navigator.ts
    predicates.ts
    task-context.ts
  tests/
    graph-basics.test.ts
    graph-query.test.ts
    predicates.test.ts
    task-context-persistence.test.ts
    jit-injection.test.ts    # NOTE: this one tests a repair-specific file — stays in core, see below
    converge-loop.test.ts
    converge-events.test.ts
```

## Exports

```ts
// Engine entry
export { converge } from './navigator';
export type { ConvergeOptions, ConvergeResult } from './navigator';

// Graph
export { NavigatorGraph } from './graph';
export type { Graph, GraphNode, GraphEdge, NodeStatus } from './types';

// Handler contract
export type { ActionHandler, WalkResult, WalkAction, Snapshot, GoalCondition } from './types';

// Predicate registry (extensible)
export { evalPredicate, registerPredicate, listPredicates } from './predicates';

// Persistence
export { TaskContext } from './task-context';
export type { WalkerState } from './task-context';

// Event contract (injected, not provided)
export type { EventSink, NavigatorEvent } from './types';
```

## Dependencies

**Target: zero runtime deps.** The engine is pure TypeScript — no journal, no filesystem, no logging framework. Everything domain-specific is plugged in by the consumer:

- **Handlers:** consumer passes `Map<string, ActionHandler>` via `ConvergeOptions.actions`.
- **Node builders (JIT injection strategies):** consumer passes preflight/response/post-action builder callbacks via `ConvergeOptions.nodeBuilders`. (Currently repair's `default-graph.ts` — stays in core as a repair strategy.)
- **Event logging:** consumer passes an `EventSink` (PR15 introduced this); journal backing lives in core.
- **Predicate registry:** ships with a minimal built-in set; consumers call `registerPredicate(name, fn)` to extend.

If anything in `packages/navigator/src/` imports filesystem APIs, path APIs, or any `@converge/*` package, that's a layering violation — refactor to an injected callback.

## Core side

- `packages/core/package.json` adds `"@converge/navigator": "workspace:*"`
- `packages/core/src/repair/navigator/` directory **deleted**
- `packages/core/src/repair/default-graph.ts` **stays** (repair's node-builder strategy — plugged into `converge()` by `Unit.run()`)
- `packages/core/src/repair/actions/` **stays** (repair's handler registry — plugged into `converge()` by `Unit.run()`)
- `packages/core/src/unit/run.ts` updates imports:
  ```ts
  import { converge } from '@converge/navigator';
  import { buildRepairActionRegistry } from '../repair/actions';
  import { buildPreflightNodes, buildResponseNodes, buildPostActionNodes } from '../repair/default-graph';
  import { journalEventSink } from '../journal/navigator-sink';  // thin adapter
  ```

## Layering invariants (hard REJECT on violation)

1. **Zero deps:** `packages/navigator/package.json` `dependencies` is empty or absent.
2. **No @converge/* imports in engine:**
   ```bash
   grep -rn "@converge/" packages/navigator/src && exit 1 || true
   ```
3. **No filesystem/IO primitives:**
   ```bash
   grep -rn "from ['\"]\(fs\|fs/promises\|path\|os\|process\)['\"]" packages/navigator/src && exit 1 || true
   ```
   (`process` allowed only if used for `process.hrtime` or `process.env` — but prefer none.)
4. **No CLI/display leakage** (same rule as elsewhere):
   ```bash
   grep -rn "@converge/display\|@converge/cli\|console\.\(log\|error\)\|process\.exit" packages/navigator/src | grep -v ".test.ts" && exit 1 || true
   ```
5. **EventSink is an interface, not a concrete logger:** `grep -n "class.*EventSink\|new.*EventSink" packages/navigator/src` → zero hits.

## Downstream verification

- `Unit.run()` still drives a repair scenario end-to-end (integration test)
- swebench + tbench still pass (they use `Unit.run()` through `@converge/core`)
- Navigator package tests pass in isolation (`pnpm --filter @converge/navigator test`) with zero dependencies installed — proves containment

## Acceptance

- All 5 layering audits pass
- `pnpm -r build` + `pnpm -r test` green across all packages
- `packages/navigator/` has zero runtime deps
- PR14 behavior-locking suites pass unchanged (only import paths updated to `@converge/navigator`)
- Repair integration test (fixture gap → strategy → resolved) passes end-to-end

## Out of scope (future PRs, explicitly not this one)

- Making `Snapshot` fully generic (`Snapshot<TState, TTrigger>`). Current shape keeps `unit` and `gaps` fields typed as `unknown` or via structural interfaces; full genericization is a follow-up that lets web/UI consumers define their own state + trigger types.
- Alternative graph backends (SQLite-backed, distributed). Keep in-memory + JSON persistence only.
- Built-in LLM-calling handlers. The engine stays AI-agnostic; handlers decide whether/how to call AI.

---

Runs the full pipeline: **analyze → implement → review → quality**.
