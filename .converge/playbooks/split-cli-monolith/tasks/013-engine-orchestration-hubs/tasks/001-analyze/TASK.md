---
id: 001-analyze
title: "Analyze — PR11b — Extract @converge/engine: orchestration hubs"
checks:
  - id: plan-written
    description: Analysis plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/analyze/plan.md"
vars:
  taskId: 001-analyze
  parentId: 013-engine-orchestration-hubs
  title: "PR11b — Extract @converge/engine: orchestration hubs"
  tier: 4 — Engine middle layer
  task: "Second engine slice: orchestrator, lifecycle, loop, converge, evolve, goal, repair (sans navigator), plugins — the cross-cutting hubs."
  spec: "Second slice of the engine extraction. Move the orchestration hubs — subdirs that cross-reference PR11a entries and each other.\n\n**Source (git mv):**\n- `packages/core/src/orchestrator/` → `packages/engine/src/orchestrator/` (includes `orchestrator/autonomous/` from PR5)\n- `packages/core/src/lifecycle/` → `packages/engine/src/lifecycle/`\n- `packages/core/src/loop/` → `packages/engine/src/loop/`\n- `packages/core/src/converge/` → `packages/engine/src/converge/`\n- `packages/core/src/evolve/` → `packages/engine/src/evolve/`\n- `packages/core/src/goal/` (evaluator only — definitions stay in core) → `packages/engine/src/goal/`\n- `packages/core/src/repair/` (minus navigator — already extracted in PR3b) → `packages/engine/src/repair/`\n  - Includes `actions/*.ts`, `default-graph.ts`, `strategies/`, `plan.ts`, `predicate.ts`, etc.\n- `packages/core/src/plugins/` → `packages/engine/src/plugins/`\n\n**Goal split (primitive vs. engine):**\n\n`packages/core/src/goal/` currently contains both `Goal` type definitions AND `GoalEvaluator` (which imports orchestrator). Before the move:\n1. Separate `goal/types.ts` + `goal/builders.ts` (primitives — stay in core)\n2. `goal/evaluator.ts` + evaluator implementation → engine\n\nIf they're already cleanly split, just move the evaluator. Otherwise, split first then move.\n\n**Imports after move:**\n- Within engine: relative paths (`../orchestrator/X`, `../repair/actions/X`)\n- To primitives: `@converge/core`, `@converge/journal`, `@converge/scheduler`, `@converge/navigator`\n- No imports from cli or display\n\n**Layering audit (runs post-move):**\n```bash\n# Engine cannot import from cli or display\ngrep -rn \"@converge/cli\\\\|@converge/display\" packages/engine/src && exit 1 || true\n\n# Engine imports only from primitive layer\ngrep -rn \"@converge/\" packages/engine/src | grep -vE \"@converge/(core|navigator|journal|scheduler)\" | grep -v \".test.ts\" && exit 1 || true\n```\n\n**Acceptance:**\n- All 8 listed subdirs live under `packages/engine/src/`\n- Goal split (types in core, evaluator in engine) if needed\n- Layering audits clean\n- swebench + tbench tests green\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/engine/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/analyze"
  wbsSection: 
---

# Analyze — PR11b — Extract @converge/engine: orchestration hubs

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** Second engine slice: orchestrator, lifecycle, loop, converge, evolve, goal, repair (sans navigator), plugins — the cross-cutting hubs.

**Full spec:**

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

Write `D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/analyze/plan.md`:

```markdown
# PR11b — Extract @converge/engine: orchestration hubs — Analysis

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
