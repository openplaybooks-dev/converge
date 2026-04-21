---
id: 001-analyze
title: Analyze — PR7 — Group cli/display/ (terminal renderer isolation)
checks:
  - id: plan-written
    description: Analysis plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/008-group-cli-display/analyze/plan.md"
vars:
  taskId: 001-analyze
  parentId: 008-group-cli-display
  title: PR7 — Group cli/display/ (terminal renderer isolation)
  tier: 2 — In-core reorg
  task: "Move tree-display, inspect-display, progress-logger, show/ renderers into cli/display/. Audit that no non-CLI code pulls display."
  spec: "Group terminal-renderer modules into `cli/display/` so they're a single isolated subtree ready for PR8 extraction.\n\n**Moves:**\n- `cli/tree-display.ts` → `cli/display/tree-display.ts`\n- `cli/inspect-display.ts` → `cli/display/inspect-display.ts`\n- `cli/progress-logger.ts` → `cli/display/progress-logger.ts`\n- `cli/show/gantt.ts` → `cli/display/show/gantt.ts` (if self-contained)\n- `cli/show/graph.ts` → `cli/display/show/graph.ts` (if self-contained)\n- Any other display-oriented helpers → `cli/display/`\n\nUse `git mv` for history.\n\n**Import sites to update (≥5):**\n```bash\ngrep -rn \"from.*cli/\\\\(tree\\\\|inspect\\\\|progress\\\\)-\\\\|from.*cli/show\" packages/core/src\n```\n\n**Layering audit — this is PR8's invariant PRE-conditioned here:**\n\n```bash\n# No non-CLI code may import display modules. Find any such imports.\ngrep -rn \"from.*cli/display\\\\|from.*cli/\\\\(tree\\\\|inspect\\\\|progress\\\\)-\\\\|from.*cli/show\" packages/core/src | grep -v \"packages/core/src/cli/\" && exit 1 || true\n```\n\nIf anything outside `cli/` imports display, it's a layering bug. Fix it in this PR (refactor or invert the dependency) — do not carry it into PR8.\n\n**Smoke:**\n- `converge show gantt`, `converge show graph`, `converge inspect` produce same output as before (capture baseline pre-move, diff post-move)\n\n**Acceptance:**\n- All display modules live under `cli/display/`\n- Grep audit above returns clean (no non-CLI code imports display)\n- Smoke checks show identical output\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/008-group-cli-display"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/analyze"
  wbsSection: 
---

# Analyze — PR7 — Group cli/display/ (terminal renderer isolation)

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** Move tree-display, inspect-display, progress-logger, show/ renderers into cli/display/. Audit that no non-CLI code pulls display.

**Full spec:**

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

Write `D:/converge/.converge/artifacts/split-cli/008-group-cli-display/analyze/plan.md`:

```markdown
# PR7 — Group cli/display/ (terminal renderer isolation) — Analysis

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
