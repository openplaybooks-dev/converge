---
id: 007-move-display
title: PR7 — Move display modules into cli/display/
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 007-move-display
  title: PR7 — Move display modules into cli/display/
  tier: A
  task: "Group tree-display, inspect-display, progress-logger + show renderers into cli/display/."
  spec: "Move:\n- `cli/tree-display.ts` → `cli/display/tree-display.ts`\n- `cli/inspect-display.ts` → `cli/display/inspect-display.ts`\n- `cli/progress-logger.ts` → `cli/display/progress-logger.ts`\n- Also relocate the show/ renderers (`gantt.ts`, `graph.ts`) into `cli/display/show/` if they're self-contained.\n\n**Import sites to update (≥5):** any file importing the moved modules. Find with:\n```bash\ngrep -rn \"from.*cli/\\(tree\\|inspect\\|progress\\)-\" packages/core/src\n```\n\n**Acceptance:**\n- `pnpm typecheck` + `pnpm test` green\n- Smoke: `converge show gantt`, `converge show graph`, `converge inspect` produce same output as before (capture baseline pre-move, diff post-move)"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\007-move-display"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR7 — Move display modules into cli/display/

**Tier:** A

**Summary:** Group tree-display, inspect-display, progress-logger + show renderers into cli/display/.

## Full specification

Move:
- `cli/tree-display.ts` → `cli/display/tree-display.ts`
- `cli/inspect-display.ts` → `cli/display/inspect-display.ts`
- `cli/progress-logger.ts` → `cli/display/progress-logger.ts`
- Also relocate the show/ renderers (`gantt.ts`, `graph.ts`) into `cli/display/show/` if they're self-contained.

**Import sites to update (≥5):** any file importing the moved modules. Find with:
```bash
grep -rn "from.*cli/\(tree\|inspect\|progress\)-" packages/core/src
```

**Acceptance:**
- `pnpm typecheck` + `pnpm test` green
- Smoke: `converge show gantt`, `converge show graph`, `converge inspect` produce same output as before (capture baseline pre-move, diff post-move)

---

Runs the full pipeline: **analyze → implement → review → quality**.
