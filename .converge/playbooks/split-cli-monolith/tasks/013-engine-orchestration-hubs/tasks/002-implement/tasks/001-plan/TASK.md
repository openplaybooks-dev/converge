---
id: 001-plan
title: "Plan implementation — PR11b — Extract @converge/engine: orchestration hubs"
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/implement/plan.md"
vars:
  taskId: 001-plan
  title: "PR11b — Extract @converge/engine: orchestration hubs"
  task: "Second engine slice: orchestrator, lifecycle, loop, converge, evolve, goal, repair (sans navigator), plugins — the cross-cutting hubs."
  spec: "Second slice of the engine extraction. Move the orchestration hubs — subdirs that cross-reference PR11a entries and each other.\n\n**Source (git mv):**\n- `packages/core/src/orchestrator/` → `packages/engine/src/orchestrator/` (includes `orchestrator/autonomous/` from PR5)\n- `packages/core/src/lifecycle/` → `packages/engine/src/lifecycle/`\n- `packages/core/src/loop/` → `packages/engine/src/loop/`\n- `packages/core/src/converge/` → `packages/engine/src/converge/`\n- `packages/core/src/evolve/` → `packages/engine/src/evolve/`\n- `packages/core/src/goal/` (evaluator only — definitions stay in core) → `packages/engine/src/goal/`\n- `packages/core/src/repair/` (minus navigator — already extracted in PR3b) → `packages/engine/src/repair/`\n  - Includes `actions/*.ts`, `default-graph.ts`, `strategies/`, `plan.ts`, `predicate.ts`, etc.\n- `packages/core/src/plugins/` → `packages/engine/src/plugins/`\n\n**Goal split (primitive vs. engine):**\n\n`packages/core/src/goal/` currently contains both `Goal` type definitions AND `GoalEvaluator` (which imports orchestrator). Before the move:\n1. Separate `goal/types.ts` + `goal/builders.ts` (primitives — stay in core)\n2. `goal/evaluator.ts` + evaluator implementation → engine\n\nIf they're already cleanly split, just move the evaluator. Otherwise, split first then move.\n\n**Imports after move:**\n- Within engine: relative paths (`../orchestrator/X`, `../repair/actions/X`)\n- To primitives: `@converge/core`, `@converge/journal`, `@converge/scheduler`, `@converge/navigator`\n- No imports from cli or display\n\n**Layering audit (runs post-move):**\n```bash\n# Engine cannot import from cli or display\ngrep -rn \"@converge/cli\\\\|@converge/display\" packages/engine/src && exit 1 || true\n\n# Engine imports only from primitive layer\ngrep -rn \"@converge/\" packages/engine/src | grep -vE \"@converge/(core|navigator|journal|scheduler)\" | grep -v \".test.ts\" && exit 1 || true\n```\n\n**Acceptance:**\n- All 8 listed subdirs live under `packages/engine/src/`\n- Goal split (types in core, evaluator in engine) if needed\n- Layering audits clean\n- swebench + tbench tests green\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/engine/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR11b — Extract @converge/engine: orchestration hubs

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/implement/plan.md`:

```markdown
# PR11b — Extract @converge/engine: orchestration hubs — Implementation Plan

## Summary
<one line>

## Changes (ordered)
1. File: `packages/core/src/...` — <create | move | edit | delete>; what
2. File: `packages/core/src/...` — ...

## Order of Operations
1. Do X first because Y depends on it
2. Then Z

## Post-change verification commands
- `pnpm --filter @converge/core build`
- `pnpm --filter @converge/core test`
- <any smoke checks specific to this PR>
```
