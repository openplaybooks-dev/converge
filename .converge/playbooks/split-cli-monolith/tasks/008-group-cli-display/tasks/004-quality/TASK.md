---
id: 004-quality
title: Quality gate — PR7 — Group cli/display/ (terminal renderer isolation)
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
  parentId: 008-group-cli-display
  title: PR7 — Group cli/display/ (terminal renderer isolation)
  tier: 2 — In-core reorg
  task: "Move tree-display, inspect-display, progress-logger, show/ renderers into cli/display/. Audit that no non-CLI code pulls display."
  spec: "Group terminal-renderer modules into `cli/display/` so they're a single isolated subtree ready for PR8 extraction.\n\n**Moves:**\n- `cli/tree-display.ts` → `cli/display/tree-display.ts`\n- `cli/inspect-display.ts` → `cli/display/inspect-display.ts`\n- `cli/progress-logger.ts` → `cli/display/progress-logger.ts`\n- `cli/show/gantt.ts` → `cli/display/show/gantt.ts` (if self-contained)\n- `cli/show/graph.ts` → `cli/display/show/graph.ts` (if self-contained)\n- Any other display-oriented helpers → `cli/display/`\n\nUse `git mv` for history.\n\n**Import sites to update (≥5):**\n```bash\ngrep -rn \"from.*cli/\\\\(tree\\\\|inspect\\\\|progress\\\\)-\\\\|from.*cli/show\" packages/core/src\n```\n\n**Layering audit — this is PR8's invariant PRE-conditioned here:**\n\n```bash\n# No non-CLI code may import display modules. Find any such imports.\ngrep -rn \"from.*cli/display\\\\|from.*cli/\\\\(tree\\\\|inspect\\\\|progress\\\\)-\\\\|from.*cli/show\" packages/core/src | grep -v \"packages/core/src/cli/\" && exit 1 || true\n```\n\nIf anything outside `cli/` imports display, it's a layering bug. Fix it in this PR (refactor or invert the dependency) — do not carry it into PR8.\n\n**Smoke:**\n- `converge show gantt`, `converge show graph`, `converge inspect` produce same output as before (capture baseline pre-move, diff post-move)\n\n**Acceptance:**\n- All display modules live under `cli/display/`\n- Grep audit above returns clean (no non-CLI code imports display)\n- Smoke checks show identical output\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/008-group-cli-display"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/quality"
  wbsSection: 
---

# Quality gate — PR7 — Group cli/display/ (terminal renderer isolation)

Final verification after code review approval. Hard gate — if anything fails here, fix it in-place before this PR is considered done.

## Steps

1. `cd D:/converge && pnpm typecheck` — must be zero errors.
2. `cd D:/converge && pnpm test` — all tests must pass.
3. `converge --help` must run (from whichever bin location applies at this point in the sequence).
4. For Tier B PRs (10–13): also run `pnpm -r build && pnpm -r test` to confirm every workspace package is healthy.
5. If anything fails, fix it here — don't defer.
