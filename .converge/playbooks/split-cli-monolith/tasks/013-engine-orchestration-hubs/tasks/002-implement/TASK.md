---
id: 002-implement
title: "Implement — PR11b — Extract @converge/engine: orchestration hubs"
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/wbs.js"
vars:
  taskId: 002-implement
  parentId: 013-engine-orchestration-hubs
  title: "PR11b — Extract @converge/engine: orchestration hubs"
  tier: 4 — Engine middle layer
  task: "Second engine slice: orchestrator, lifecycle, loop, converge, evolve, goal, repair (sans navigator), plugins — the cross-cutting hubs."
  spec: "Second slice of the engine extraction. Move the orchestration hubs — subdirs that cross-reference PR11a entries and each other.\n\n**Source (git mv):**\n- `packages/core/src/orchestrator/` → `packages/engine/src/orchestrator/` (includes `orchestrator/autonomous/` from PR5)\n- `packages/core/src/lifecycle/` → `packages/engine/src/lifecycle/`\n- `packages/core/src/loop/` → `packages/engine/src/loop/`\n- `packages/core/src/converge/` → `packages/engine/src/converge/`\n- `packages/core/src/evolve/` → `packages/engine/src/evolve/`\n- `packages/core/src/goal/` (evaluator only — definitions stay in core) → `packages/engine/src/goal/`\n- `packages/core/src/repair/` (minus navigator — already extracted in PR3b) → `packages/engine/src/repair/`\n  - Includes `actions/*.ts`, `default-graph.ts`, `strategies/`, `plan.ts`, `predicate.ts`, etc.\n- `packages/core/src/plugins/` → `packages/engine/src/plugins/`\n\n**Goal split (primitive vs. engine):**\n\n`packages/core/src/goal/` currently contains both `Goal` type definitions AND `GoalEvaluator` (which imports orchestrator). Before the move:\n1. Separate `goal/types.ts` + `goal/builders.ts` (primitives — stay in core)\n2. `goal/evaluator.ts` + evaluator implementation → engine\n\nIf they're already cleanly split, just move the evaluator. Otherwise, split first then move.\n\n**Imports after move:**\n- Within engine: relative paths (`../orchestrator/X`, `../repair/actions/X`)\n- To primitives: `@converge/core`, `@converge/journal`, `@converge/scheduler`, `@converge/navigator`\n- No imports from cli or display\n\n**Layering audit (runs post-move):**\n```bash\n# Engine cannot import from cli or display\ngrep -rn \"@converge/cli\\\\|@converge/display\" packages/engine/src && exit 1 || true\n\n# Engine imports only from primitive layer\ngrep -rn \"@converge/\" packages/engine/src | grep -vE \"@converge/(core|navigator|journal|scheduler)\" | grep -v \".test.ts\" && exit 1 || true\n```\n\n**Acceptance:**\n- All 8 listed subdirs live under `packages/engine/src/`\n- Goal split (types in core, evaluator in engine) if needed\n- Layering audits clean\n- swebench + tbench tests green\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/engine/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/wbs.js\""
---

# Implement — PR11b — Extract @converge/engine: orchestration hubs

Read the analysis, split into todos, execute each, then verify.

Pipeline: **plan → todos → verify**.
