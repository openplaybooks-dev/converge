---
id: 003-review
title: "Review — PR11b — Extract @converge/engine: orchestration hubs"
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/review/report.md"
vars:
  taskId: 003-review
  parentId: 013-engine-orchestration-hubs
  title: "PR11b — Extract @converge/engine: orchestration hubs"
  tier: 4 — Engine middle layer
  task: "Second engine slice: orchestrator, lifecycle, loop, converge, evolve, goal, repair (sans navigator), plugins — the cross-cutting hubs."
  spec: "Second slice of the engine extraction. Move the orchestration hubs — subdirs that cross-reference PR11a entries and each other.\n\n**Source (git mv):**\n- `packages/core/src/orchestrator/` → `packages/engine/src/orchestrator/` (includes `orchestrator/autonomous/` from PR5)\n- `packages/core/src/lifecycle/` → `packages/engine/src/lifecycle/`\n- `packages/core/src/loop/` → `packages/engine/src/loop/`\n- `packages/core/src/converge/` → `packages/engine/src/converge/`\n- `packages/core/src/evolve/` → `packages/engine/src/evolve/`\n- `packages/core/src/goal/` (evaluator only — definitions stay in core) → `packages/engine/src/goal/`\n- `packages/core/src/repair/` (minus navigator — already extracted in PR3b) → `packages/engine/src/repair/`\n  - Includes `actions/*.ts`, `default-graph.ts`, `strategies/`, `plan.ts`, `predicate.ts`, etc.\n- `packages/core/src/plugins/` → `packages/engine/src/plugins/`\n\n**Goal split (primitive vs. engine):**\n\n`packages/core/src/goal/` currently contains both `Goal` type definitions AND `GoalEvaluator` (which imports orchestrator). Before the move:\n1. Separate `goal/types.ts` + `goal/builders.ts` (primitives — stay in core)\n2. `goal/evaluator.ts` + evaluator implementation → engine\n\nIf they're already cleanly split, just move the evaluator. Otherwise, split first then move.\n\n**Imports after move:**\n- Within engine: relative paths (`../orchestrator/X`, `../repair/actions/X`)\n- To primitives: `@converge/core`, `@converge/journal`, `@converge/scheduler`, `@converge/navigator`\n- No imports from cli or display\n\n**Layering audit (runs post-move):**\n```bash\n# Engine cannot import from cli or display\ngrep -rn \"@converge/cli\\\\|@converge/display\" packages/engine/src && exit 1 || true\n\n# Engine imports only from primitive layer\ngrep -rn \"@converge/\" packages/engine/src | grep -vE \"@converge/(core|navigator|journal|scheduler)\" | grep -v \".test.ts\" && exit 1 || true\n```\n\n**Acceptance:**\n- All 8 listed subdirs live under `packages/engine/src/`\n- Goal split (types in core, evaluator in engine) if needed\n- Layering audits clean\n- swebench + tbench tests green\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/engine/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR11b — Extract @converge/engine: orchestration hubs

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Second engine slice: orchestrator, lifecycle, loop, converge, evolve, goal, repair (sans navigator), plugins — the cross-cutting hubs.
- **Full spec:**

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

- Analysis: `D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/implement/plan.md`

## Review criteria

1. **Alignment** — does the diff match the spec? Files named in the spec should be the only files changed (plus strictly required import updates). If scope drifted, **REJECT**.
2. **Acceptance criteria** — every bullet in the spec's Acceptance block must be satisfied. If not, REJECT.
3. **Behavior-locking tests (PR1)** — still green? If a move/split broke them, the split is wrong, REJECT.
4. **No shims** — the user explicitly chose hard breaks for public exports (PR4, PR13). If a re-export shim was added "for safety", REJECT.
5. **Line limits** — for split PRs (3, 5, 6, 9), every new file ≤500 lines. If any file is larger, REJECT.
6. **Layering (CRITICAL for Tier B, PR10–PR13)** — `@converge/core` is the programmatic interface; `@converge/cli` is the terminal-facing shell; a future web UI must be able to integrate directly with `core` without touching `cli` or `display`. Run these audits and **REJECT** on any hit:
   - `grep -rn "@converge/display\|@converge/cli" packages/core/src` → no matches (core never imports CLI-layer packages)
   - `grep -n "@converge/display\|@converge/cli" packages/core/package.json` → no matches
   - `grep -rn "process\.exit\|process\.stdout\.write\|process\.stderr\.write" packages/core/src` → no matches
   - `grep -rn "console\.\(log\|error\|warn\|info\)" packages/core/src | grep -v ".test.ts"` → no matches
   - `grep -rn "@converge/display" packages/scheduler/src packages/journal/src 2>/dev/null` → no matches
7. **Style** — matches existing codebase conventions.

## Steps

1. `git diff --stat` — confirm only spec-scoped files changed.
2. `git diff` — read the full diff.
3. Re-run `pnpm test` to confirm green.
4. Compare diff against each Acceptance bullet.

## Output

Write `D:/converge/.converge/artifacts/split-cli/013-engine-orchestration-hubs/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
