---
id: 001-plan
title: Plan implementation — PR7 — Group cli/display/ (terminal renderer isolation)
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/008-group-cli-display/implement/plan.md"
vars:
  taskId: 001-plan
  title: PR7 — Group cli/display/ (terminal renderer isolation)
  task: "Move tree-display, inspect-display, progress-logger, show/ renderers into cli/display/. Audit that no non-CLI code pulls display."
  spec: "Group terminal-renderer modules into `cli/display/` so they're a single isolated subtree ready for PR8 extraction.\n\n**Moves:**\n- `cli/tree-display.ts` → `cli/display/tree-display.ts`\n- `cli/inspect-display.ts` → `cli/display/inspect-display.ts`\n- `cli/progress-logger.ts` → `cli/display/progress-logger.ts`\n- `cli/show/gantt.ts` → `cli/display/show/gantt.ts` (if self-contained)\n- `cli/show/graph.ts` → `cli/display/show/graph.ts` (if self-contained)\n- Any other display-oriented helpers → `cli/display/`\n\nUse `git mv` for history.\n\n**Import sites to update (≥5):**\n```bash\ngrep -rn \"from.*cli/\\\\(tree\\\\|inspect\\\\|progress\\\\)-\\\\|from.*cli/show\" packages/core/src\n```\n\n**Layering audit — this is PR8's invariant PRE-conditioned here:**\n\n```bash\n# No non-CLI code may import display modules. Find any such imports.\ngrep -rn \"from.*cli/display\\\\|from.*cli/\\\\(tree\\\\|inspect\\\\|progress\\\\)-\\\\|from.*cli/show\" packages/core/src | grep -v \"packages/core/src/cli/\" && exit 1 || true\n```\n\nIf anything outside `cli/` imports display, it's a layering bug. Fix it in this PR (refactor or invert the dependency) — do not carry it into PR8.\n\n**Smoke:**\n- `converge show gantt`, `converge show graph`, `converge inspect` produce same output as before (capture baseline pre-move, diff post-move)\n\n**Acceptance:**\n- All display modules live under `cli/display/`\n- Grep audit above returns clean (no non-CLI code imports display)\n- Smoke checks show identical output\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/008-group-cli-display"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR7 — Group cli/display/ (terminal renderer isolation)

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/008-group-cli-display/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/008-group-cli-display/implement/plan.md`:

```markdown
# PR7 — Group cli/display/ (terminal renderer isolation) — Implementation Plan

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
