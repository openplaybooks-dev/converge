---
id: 001-analyze
title: "Analyze — PR3b — Extract @converge/navigator workspace package (zero-dep)"
checks:
  - id: plan-written
    description: Analysis plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/004-extract-navigator-pkg/analyze/plan.md"
vars:
  taskId: 001-analyze
  parentId: 004-extract-navigator-pkg
  title: "PR3b — Extract @converge/navigator workspace package (zero-dep)"
  tier: 1 — Navigator upper-front
  task: git mv the 5 engine files to packages/navigator/src/. Zero runtime deps. AI-driven reactive navigator — drives plugged-in handlers/scenarios through JIT-buffered nodes.
  spec: "Create `packages/navigator/` workspace package — the reactive JIT-buffered graph engine that PR3a isolated.\n\n**Concept:** `@converge/navigator` is the **driver** for AI-influenced reactive flows. Graph of handler nodes, buffered just-in-time (never pre-seeded), selected by predicate applicability against a live snapshot, advanced one iteration at a time. AI enters through plugged-in handlers, not through the engine itself.\n\n**Source (git mv):**\n- `packages/core/src/repair/navigator/graph.ts` → `packages/navigator/src/graph.ts`\n- `packages/core/src/repair/navigator/types.ts` → `packages/navigator/src/types.ts`\n- `packages/core/src/repair/navigator/navigator.ts` → `packages/navigator/src/navigator.ts`\n- `packages/core/src/repair/navigator/predicates.ts` → `packages/navigator/src/predicates.ts`\n- `packages/core/src/repair/navigator/task-context.ts` → `packages/navigator/src/task-context.ts`\n- `packages/navigator/src/index.ts` (new barrel)\n- PR1 navigator tests → `packages/navigator/tests/`\n\n**Stays in core:**\n- `repair/default-graph.ts` — repair's node-builder strategy (consumer-plugged)\n- `repair/actions/*.ts` — repair's 20 handlers (consumer-plugged)\n\n**Exports:**\n```ts\nexport { converge } from './navigator';\nexport { NavigatorGraphImpl } from './graph';  // default in-memory impl\nexport type {\n  NavigatorGraph, GraphNode, GraphEdge, NodeStatus,\n  Snapshot, ActionHandler, WalkResult, WalkAction, GoalCondition,\n  EventSink, NavigatorEvent,\n} from './types';\nexport { evalPredicate, registerPredicate, listPredicates } from './predicates';\nexport { TaskContext } from './task-context';\nexport type { WalkerState, TaskContextDeps } from './task-context';\n```\n\n**Package shape:**\n- `package.json` — name `@converge/navigator`, **zero** `dependencies`\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n\n**Core side:**\n- `packages/core/package.json` adds `\"@converge/navigator\": \"workspace:*\"`\n- `packages/core/src/repair/navigator/` directory **deleted**\n- `packages/core/src/unit/run.ts` imports `converge` and `TaskContext` from `@converge/navigator`; passes action registry (from `../repair/actions`), node builders (from `../repair/default-graph`), journal-backed `EventSink`, and `getJournalStructure` callback\n\n**Layering invariants (REJECT on violation):**\n```bash\n# Zero runtime deps\ntest -z \"$(node -e \"console.log(Object.keys(require('./packages/navigator/package.json').dependencies||{}).join('\\n'))\")\"\n\n# No @converge/* imports\ngrep -rn \"@converge/\" packages/navigator/src && exit 1 || true\n\n# No filesystem/IO primitives\ngrep -rnE \"from ['\\\"](fs|fs/promises|path|os)['\\\"]\" packages/navigator/src && exit 1 || true\n\n# No CLI leakage\ngrep -rnE \"process\\\\.exit|process\\\\.stdout\\\\.write|console\\\\.(log|error|warn|info)\" packages/navigator/src | grep -v \".test.ts\" && exit 1 || true\n\n# EventSink stays an interface\ngrep -nE \"class [A-Z][a-zA-Z]*EventSink\" packages/navigator/src && exit 1 || true\n```\n\n**Downstream verification:**\n- `Unit.run()` drives a fixture repair scenario end-to-end\n- swebench + tbench tests green (no core API change)\n- `pnpm --filter @converge/navigator test` passes in isolation\n- `madge --circular packages/navigator/src` — no cycles\n\n**Acceptance:**\n- All 5 layering audits clean\n- PR1 navigator suites pass unchanged (only import path updated to `@converge/navigator`)\n- `pnpm -r build` + `pnpm -r test` green across all packages"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/004-extract-navigator-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/analyze"
  wbsSection: 
---

# Analyze — PR3b — Extract @converge/navigator workspace package (zero-dep)

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** git mv the 5 engine files to packages/navigator/src/. Zero runtime deps. AI-driven reactive navigator — drives plugged-in handlers/scenarios through JIT-buffered nodes.

**Full spec:**

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

## Steps

1. **Read the spec** above carefully — it names exact file paths, line ranges, and acceptance criteria.
2. **Inspect current state:**
   - Read every file path named in the spec; note its current size, exports, imports.
   - Run `grep -rn "from.*<module>" packages/core/src` to enumerate real import sites — the spec's numbers are estimates, the grep is truth.
   - Check `git log --oneline -- <path>` for recent churn that might complicate the move.
3. **Identify risks:**
   - Cyclic imports introduced by the split
   - Public API paths that downstream packages (swebench, tbench) import from
   - Line-range drift since the spec was written — symbols may have moved
4. **Write the plan.**

## Output

Write `D:/converge/.converge/artifacts/split-cli/004-extract-navigator-pkg/analyze/plan.md`:

```markdown
# PR3b — Extract @converge/navigator workspace package (zero-dep) — Analysis

## Source audit
- <file>: <current lines>, <exports>, <consumers found via grep>

## Implementation plan
1. Step — what to do and why
2. Step — ...

## Risks & mitigations
- <risk>: <mitigation>

## Acceptance checklist (copy from spec)
- [ ] <criterion>
- [ ] <criterion>
```
