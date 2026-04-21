---
id: 001-execute
title: "Execute: git mv the 5 engine files to packages/navigator/src/. Zero runtime deps. AI-driven reactive navigator — drives plugged-in handlers/scenarios through JIT-buffered nodes."
---

Implement the PR.

**Summary:** git mv the 5 engine files to packages/navigator/src/. Zero runtime deps. AI-driven reactive navigator — drives plugged-in handlers/scenarios through JIT-buffered nodes.

**Spec:**
Create `packages/navigator/` workspace package — the reactive JIT-buffered graph engine that PR3a isolated.

**Concept:** `@converge/navigator` is the **driver** for AI-influenced reactive flows. Graph of handler nodes, buffered just-in-time (never pre-seeded), selected by predicate applicability against a live snapshot, advanced one iteration at a time. AI enters through plugged-in handlers, not through the engine itself.

**Source (git mv):**
- `packages/core/src/repair/navigator/graph.ts` → `packages/navigator/src/graph.ts`
- `packages/core/src/repair/navigator/types.ts` → `packages/navigator/src/types.ts`
- `packages/core/src/repair/navigator/navigator.ts` → `packages/navigator/src/navigator.ts`
- `packages/core/src/repair/navigator/predicates.ts` → `packages/navigator/src/predicates.ts`
- `packages/core/src/repair/navigator/task-context.ts` → `packages/navigator/src/task-context.ts`
- `packages/navigator/src/index.ts` (new barrel)
- PR1 navigator tests → `packages/navigator/tests/`

**Stays in core:**
- `repair/default-graph.ts` — repair's node-builder strategy (consumer-plugged)
- `repair/actions/*.ts` — repair's 20 handlers (consumer-plugged)

**Exports:**
```ts
export { converge } from './navigator';
export { NavigatorGraphImpl } from './graph';  // default in-memory impl
export type {
  NavigatorGraph, GraphNode, GraphEdge, NodeStatus,
  Snapshot, ActionHandler, WalkResult, WalkAction, GoalCondition,
  EventSink, NavigatorEvent,
} from './types';
export { evalPredicate, registerPredicate, listPredicates } from './predicates';
export { TaskContext } from './task-context';
export type { WalkerState, TaskContextDeps } from './task-context';
```

**Package shape:**
- `package.json` — name `@converge/navigator`, **zero** `dependencies`
- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`

**Core side:**
- `packages/core/package.json` adds `"@converge/navigator": "workspace:*"`
- `packages/core/src/repair/navigator/` directory **deleted**
- `packages/core/src/unit/run.ts` imports `converge` and `TaskContext` from `@converge/navigator`; passes action registry (from `../repair/actions`), node builders (from `../repair/default-graph`), journal-backed `EventSink`, and `getJournalStructure` callback

**Layering invariants (REJECT on violation):**
```bash
# Zero runtime deps
test -z "$(node -e "console.log(Object.keys(require('./packages/navigator/package.json').dependencies||{}).join('\n'))")"

# No @converge/* imports
grep -rn "@converge/" packages/navigator/src && exit 1 || true

# No filesystem/IO primitives
grep -rnE "from ['\"](fs|fs/promises|path|os)['\"]" packages/navigator/src && exit 1 || true

# No CLI leakage
grep -rnE "process\\.exit|process\\.stdout\\.write|console\\.(log|error|warn|info)" packages/navigator/src | grep -v ".test.ts" && exit 1 || true

# EventSink stays an interface
grep -nE "class [A-Z][a-zA-Z]*EventSink" packages/navigator/src && exit 1 || true
```

**Downstream verification:**
- `Unit.run()` drives a fixture repair scenario end-to-end
- swebench + tbench tests green (no core API change)
- `pnpm --filter @converge/navigator test` passes in isolation
- `madge --circular packages/navigator/src` — no cycles

**Acceptance:**
- All 5 layering audits clean
- PR1 navigator suites pass unchanged (only import path updated to `@converge/navigator`)
- `pnpm -r build` + `pnpm -r test` green across all packages

**Analysis:** `D:/converge/.converge/artifacts/split-cli/004-extract-navigator-pkg/analyze/plan.md`
