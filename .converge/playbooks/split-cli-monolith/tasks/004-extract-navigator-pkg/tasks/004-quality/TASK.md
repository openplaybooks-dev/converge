---
id: 004-quality
title: "Quality gate — PR3b — Extract @converge/navigator workspace package (zero-dep)"
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd D:/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd D:/converge && pnpm test 2>&1 | tail -1"
  - id: cli-smoke
    description: converge --help runs (tolerates pre/post-PR13 bin location)
    cmd: "cd D:/converge && node packages/core/dist/cli/main.js --help >/dev/null 2>&1 || node packages/cli/dist/main.js --help >/dev/null 2>&1"
vars:
  taskId: 004-quality
  parentId: 004-extract-navigator-pkg
  title: "PR3b — Extract @converge/navigator workspace package (zero-dep)"
  tier: 1 — Navigator upper-front
  task: git mv the 5 engine files to packages/navigator/src/. Zero runtime deps. AI-driven reactive navigator — drives plugged-in handlers/scenarios through JIT-buffered nodes.
  spec: "Create `packages/navigator/` workspace package — the reactive JIT-buffered graph engine that PR3a isolated.\n\n**Concept:** `@converge/navigator` is the **driver** for AI-influenced reactive flows. Graph of handler nodes, buffered just-in-time (never pre-seeded), selected by predicate applicability against a live snapshot, advanced one iteration at a time. AI enters through plugged-in handlers, not through the engine itself.\n\n**Source (git mv):**\n- `packages/core/src/repair/navigator/graph.ts` → `packages/navigator/src/graph.ts`\n- `packages/core/src/repair/navigator/types.ts` → `packages/navigator/src/types.ts`\n- `packages/core/src/repair/navigator/navigator.ts` → `packages/navigator/src/navigator.ts`\n- `packages/core/src/repair/navigator/predicates.ts` → `packages/navigator/src/predicates.ts`\n- `packages/core/src/repair/navigator/task-context.ts` → `packages/navigator/src/task-context.ts`\n- `packages/navigator/src/index.ts` (new barrel)\n- PR1 navigator tests → `packages/navigator/tests/`\n\n**Stays in core:**\n- `repair/default-graph.ts` — repair's node-builder strategy (consumer-plugged)\n- `repair/actions/*.ts` — repair's 20 handlers (consumer-plugged)\n\n**Exports:**\n```ts\nexport { converge } from './navigator';\nexport { NavigatorGraphImpl } from './graph';  // default in-memory impl\nexport type {\n  NavigatorGraph, GraphNode, GraphEdge, NodeStatus,\n  Snapshot, ActionHandler, WalkResult, WalkAction, GoalCondition,\n  EventSink, NavigatorEvent,\n} from './types';\nexport { evalPredicate, registerPredicate, listPredicates } from './predicates';\nexport { TaskContext } from './task-context';\nexport type { WalkerState, TaskContextDeps } from './task-context';\n```\n\n**Package shape:**\n- `package.json` — name `@converge/navigator`, **zero** `dependencies`\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n\n**Core side:**\n- `packages/core/package.json` adds `\"@converge/navigator\": \"workspace:*\"`\n- `packages/core/src/repair/navigator/` directory **deleted**\n- `packages/core/src/unit/run.ts` imports `converge` and `TaskContext` from `@converge/navigator`; passes action registry (from `../repair/actions`), node builders (from `../repair/default-graph`), journal-backed `EventSink`, and `getJournalStructure` callback\n\n**Layering invariants (REJECT on violation):**\n```bash\n# Zero runtime deps\ntest -z \"$(node -e \"console.log(Object.keys(require('./packages/navigator/package.json').dependencies||{}).join('\\n'))\")\"\n\n# No @converge/* imports\ngrep -rn \"@converge/\" packages/navigator/src && exit 1 || true\n\n# No filesystem/IO primitives\ngrep -rnE \"from ['\\\"](fs|fs/promises|path|os)['\\\"]\" packages/navigator/src && exit 1 || true\n\n# No CLI leakage\ngrep -rnE \"process\\\\.exit|process\\\\.stdout\\\\.write|console\\\\.(log|error|warn|info)\" packages/navigator/src | grep -v \".test.ts\" && exit 1 || true\n\n# EventSink stays an interface\ngrep -nE \"class [A-Z][a-zA-Z]*EventSink\" packages/navigator/src && exit 1 || true\n```\n\n**Downstream verification:**\n- `Unit.run()` drives a fixture repair scenario end-to-end\n- swebench + tbench tests green (no core API change)\n- `pnpm --filter @converge/navigator test` passes in isolation\n- `madge --circular packages/navigator/src` — no cycles\n\n**Acceptance:**\n- All 5 layering audits clean\n- PR1 navigator suites pass unchanged (only import path updated to `@converge/navigator`)\n- `pnpm -r build` + `pnpm -r test` green across all packages"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/004-extract-navigator-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR3b — Extract @converge/navigator workspace package (zero-dep)

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
