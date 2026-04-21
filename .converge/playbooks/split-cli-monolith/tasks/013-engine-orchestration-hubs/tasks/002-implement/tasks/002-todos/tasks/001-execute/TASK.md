---
id: 001-execute
title: "Execute: Second engine slice: orchestrator, lifecycle, loop, converge, evolve, goal, repair (sans navigator), plugins — the cross-cutting hubs."
---

Implement the PR.

**Summary:** Second engine slice: orchestrator, lifecycle, loop, converge, evolve, goal, repair (sans navigator), plugins — the cross-cutting hubs.

**Spec:**
Second slice of the engine extraction. Move the orchestration hubs — subdirs that cross-reference PR11a entries and each other.

**Source (git mv):**
- `packages/core/src/orchestrator/` → `packages/engine/src/orchestrator/` (includes `orchestrator/autonomous/` from PR5)
- `packages/core/src/lifecycle/` → `packages/engine/src/lifecycle/`
- `packages/core/src/loop/` → `packages/engine/src/loop/`
- `packages/core/src/converge/` → `packages/engine/src/converge/`
- `packages/core/src/evolve/` → `packages/engine/src/evolve/`
- `packages/core/src/goal/` (evaluator only — definitions stay in core) → `packages/engine/src/goal/`
- `packages/core/src/repair/` (minus navigator — already extracted in PR3b) → `packages/engine/src/repair/`
  - Includes `actions/*.ts`, `default-graph.ts`, `strategies/`, `plan.ts`, `predicate.ts`, etc.
- `packages/core/src/plugins/` → `packages/engine/src/plugins/`

**Goal split (primitive vs. engine):**

`packages/core/src/goal/` currently contains both `Goal` type definitions AND `GoalEvaluator` (which imports orchestrator). Before the move:
1. Separate `goal/types.ts` + `goal/builders.ts` (primitives — stay in core)
2. `goal/evaluator.ts` + evaluator implementation → engine

If they're already cleanly split, just move the evaluator. Otherwise, split first then move.

**Imports after move:**
- Within engine: relative paths (`../orchestrator/X`, `../repair/actions/X`)
- To primitives: `@converge/core`, `@converge/journal`, `@converge/scheduler`, `@converge/navigator`
- No imports from cli or display

**Layering audit (runs post-move):**
```bash
# Engine cannot import from cli or display
grep -rn "@converge/cli\\|@converge/display" packages/engine/src && exit 1 || true

# Engine imports only from primitive layer
grep -rn "@converge/" packages/engine/src | grep -vE "@converge/(core|navigator|journal|scheduler)" | grep -v ".test.ts" && exit 1 || true
```

**Acceptance:**
- All 8 listed subdirs live under `packages/engine/src/`
- Goal split (types in core, evaluator in engine) if needed
- Layering audits clean
- swebench + tbench tests green
- `pnpm -r build` + `pnpm -r test` green
- `madge --circular packages/engine/src` — no cycles

**Analysis:** `D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/analyze/plan.md`
