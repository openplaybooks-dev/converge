---
id: 001-plan
title: "Plan implementation — PR8 — Extract @converge/display workspace package"
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg/implement/plan.md"
vars:
  taskId: 001-plan
  title: "PR8 — Extract @converge/display workspace package"
  task: "Move cli/display/* to packages/display/. Zero runtime deps. Consumed only by CLI (pre-PR13) — a future web UI supplies its own renderer."
  spec: "Create `packages/display/` workspace package — a **terminal/ANSI renderer**, not a general formatting lib.\n\n**Source (git mv):** `packages/core/src/cli/display/*` → `packages/display/src/`\n\n**Package shape:**\n- `package.json` — name `@converge/display`, `dependencies: {}` (zero)\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `src/index.ts` — exports `printTaskTree`, `formatInspectSession`, `ProgressLogger`, color/box helpers\n\n**Layering invariant — HARD RULE:**\n\n`@converge/display` is consumed **only** by `@converge/cli` (post-PR13). Pre-PR13, it's consumed by `packages/core/src/cli/` — that's fine because cli/ is moving to `@converge/cli` later.\n\nIt must NOT appear in:\n- `packages/core/package.json` dependencies (temporarily added pre-PR13; removed in PR13)\n- any import in `packages/core/src/` outside `cli/`\n- any import in `packages/scheduler/src/`, `packages/journal/src/`, `packages/navigator/src/`\n- any import in `packages/engine/src/` (post-PR11)\n\n**Core side (temporary wiring):**\n- `packages/core/package.json` adds `\"@converge/display\": \"workspace:*\"` (will be removed in PR13 when cli/ leaves core)\n- Update imports in `packages/core/src/cli/` from `./display/*` → `@converge/display`\n\n**Layering audits (REJECT on hit):**\n```bash\n# No cross-package display leakage\ngrep -rn \"@converge/display\" packages/core/src | grep -v \"packages/core/src/cli/\" && exit 1 || true\ngrep -rn \"@converge/display\" packages/scheduler/src packages/journal/src packages/navigator/src 2>/dev/null && exit 1 || true\n\n# Display is zero-dep\ntest -z \"$(node -e \"const d=require('./packages/display/package.json').dependencies||{};console.log(Object.keys(d).join('\\n'))\")\"\n```\n\n**Acceptance:**\n- All 3 layering audits clean\n- `pnpm -r build` + `pnpm -r test` green\n- `pnpm install` from clean state — no phantom deps\n- `@converge/display` tests run in isolation\n- `madge --circular packages/display/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR8 — Extract @converge/display workspace package

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg/implement/plan.md`:

```markdown
# PR8 — Extract @converge/display workspace package — Implementation Plan

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
