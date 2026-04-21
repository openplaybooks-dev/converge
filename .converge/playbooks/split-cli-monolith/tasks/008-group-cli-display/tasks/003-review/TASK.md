---
id: 003-review
title: Review — PR7 — Group cli/display/ (terminal renderer isolation)
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/008-group-cli-display/review/report.md"
vars:
  taskId: 003-review
  parentId: 008-group-cli-display
  title: PR7 — Group cli/display/ (terminal renderer isolation)
  tier: 2 — In-core reorg
  task: "Move tree-display, inspect-display, progress-logger, show/ renderers into cli/display/. Audit that no non-CLI code pulls display."
  spec: "Group terminal-renderer modules into `cli/display/` so they're a single isolated subtree ready for PR8 extraction.\n\n**Moves:**\n- `cli/tree-display.ts` → `cli/display/tree-display.ts`\n- `cli/inspect-display.ts` → `cli/display/inspect-display.ts`\n- `cli/progress-logger.ts` → `cli/display/progress-logger.ts`\n- `cli/show/gantt.ts` → `cli/display/show/gantt.ts` (if self-contained)\n- `cli/show/graph.ts` → `cli/display/show/graph.ts` (if self-contained)\n- Any other display-oriented helpers → `cli/display/`\n\nUse `git mv` for history.\n\n**Import sites to update (≥5):**\n```bash\ngrep -rn \"from.*cli/\\\\(tree\\\\|inspect\\\\|progress\\\\)-\\\\|from.*cli/show\" packages/core/src\n```\n\n**Layering audit — this is PR8's invariant PRE-conditioned here:**\n\n```bash\n# No non-CLI code may import display modules. Find any such imports.\ngrep -rn \"from.*cli/display\\\\|from.*cli/\\\\(tree\\\\|inspect\\\\|progress\\\\)-\\\\|from.*cli/show\" packages/core/src | grep -v \"packages/core/src/cli/\" && exit 1 || true\n```\n\nIf anything outside `cli/` imports display, it's a layering bug. Fix it in this PR (refactor or invert the dependency) — do not carry it into PR8.\n\n**Smoke:**\n- `converge show gantt`, `converge show graph`, `converge inspect` produce same output as before (capture baseline pre-move, diff post-move)\n\n**Acceptance:**\n- All display modules live under `cli/display/`\n- Grep audit above returns clean (no non-CLI code imports display)\n- Smoke checks show identical output\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/008-group-cli-display"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR7 — Group cli/display/ (terminal renderer isolation)

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Move tree-display, inspect-display, progress-logger, show/ renderers into cli/display/. Audit that no non-CLI code pulls display.
- **Full spec:**

Group terminal-renderer modules into `cli/display/` so they're a single isolated subtree ready for PR8 extraction.

**Moves:**
- `cli/tree-display.ts` → `cli/display/tree-display.ts`
- `cli/inspect-display.ts` → `cli/display/inspect-display.ts`
- `cli/progress-logger.ts` → `cli/display/progress-logger.ts`
- `cli/show/gantt.ts` → `cli/display/show/gantt.ts` (if self-contained)
- `cli/show/graph.ts` → `cli/display/show/graph.ts` (if self-contained)
- Any other display-oriented helpers → `cli/display/`

Use `git mv` for history.

**Import sites to update (≥5):**
```bash
grep -rn "from.*cli/\\(tree\\|inspect\\|progress\\)-\\|from.*cli/show" packages/core/src
```

**Layering audit — this is PR8's invariant PRE-conditioned here:**

```bash
# No non-CLI code may import display modules. Find any such imports.
grep -rn "from.*cli/display\\|from.*cli/\\(tree\\|inspect\\|progress\\)-\\|from.*cli/show" packages/core/src | grep -v "packages/core/src/cli/" && exit 1 || true
```

If anything outside `cli/` imports display, it's a layering bug. Fix it in this PR (refactor or invert the dependency) — do not carry it into PR8.

**Smoke:**
- `converge show gantt`, `converge show graph`, `converge inspect` produce same output as before (capture baseline pre-move, diff post-move)

**Acceptance:**
- All display modules live under `cli/display/`
- Grep audit above returns clean (no non-CLI code imports display)
- Smoke checks show identical output
- `pnpm typecheck` + `pnpm test` green

- Analysis: `D:/converge/.converge/artifacts/split-cli/008-group-cli-display/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/008-group-cli-display/implement/plan.md`

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

Write `D:/converge/.converge/artifacts/split-cli/008-group-cli-display/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
