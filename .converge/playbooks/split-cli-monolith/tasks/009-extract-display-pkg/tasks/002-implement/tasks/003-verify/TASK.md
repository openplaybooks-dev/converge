---
id: 003-verify
title: "Verify implementation — PR8 — Extract @converge/display workspace package"
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd D:/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd D:/converge && pnpm test 2>&1 | tail -1"
vars:
  taskId: 003-verify
  title: "PR8 — Extract @converge/display workspace package"
  task: "Move cli/display/* to packages/display/. Zero runtime deps. Consumed only by CLI (pre-PR13) — a future web UI supplies its own renderer."
  spec: "Create `packages/display/` workspace package — a **terminal/ANSI renderer**, not a general formatting lib.\n\n**Source (git mv):** `packages/core/src/cli/display/*` → `packages/display/src/`\n\n**Package shape:**\n- `package.json` — name `@converge/display`, `dependencies: {}` (zero)\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `src/index.ts` — exports `printTaskTree`, `formatInspectSession`, `ProgressLogger`, color/box helpers\n\n**Layering invariant — HARD RULE:**\n\n`@converge/display` is consumed **only** by `@converge/cli` (post-PR13). Pre-PR13, it's consumed by `packages/core/src/cli/` — that's fine because cli/ is moving to `@converge/cli` later.\n\nIt must NOT appear in:\n- `packages/core/package.json` dependencies (temporarily added pre-PR13; removed in PR13)\n- any import in `packages/core/src/` outside `cli/`\n- any import in `packages/scheduler/src/`, `packages/journal/src/`, `packages/navigator/src/`\n- any import in `packages/engine/src/` (post-PR11)\n\n**Core side (temporary wiring):**\n- `packages/core/package.json` adds `\"@converge/display\": \"workspace:*\"` (will be removed in PR13 when cli/ leaves core)\n- Update imports in `packages/core/src/cli/` from `./display/*` → `@converge/display`\n\n**Layering audits (REJECT on hit):**\n```bash\n# No cross-package display leakage\ngrep -rn \"@converge/display\" packages/core/src | grep -v \"packages/core/src/cli/\" && exit 1 || true\ngrep -rn \"@converge/display\" packages/scheduler/src packages/journal/src packages/navigator/src 2>/dev/null && exit 1 || true\n\n# Display is zero-dep\ntest -z \"$(node -e \"const d=require('./packages/display/package.json').dependencies||{};console.log(Object.keys(d).join('\\n'))\")\"\n```\n\n**Acceptance:**\n- All 3 layering audits clean\n- `pnpm -r build` + `pnpm -r test` green\n- `pnpm install` from clean state — no phantom deps\n- `@converge/display` tests run in isolation\n- `madge --circular packages/display/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/verify"
  wbsSection: 
---

# Verify implementation — PR8 — Extract @converge/display workspace package

Quick verification that the PR's implementation doesn't break the build or tests.

## Steps

1. `cd D:/converge && pnpm typecheck` — fix any type errors introduced by this PR.
2. `cd D:/converge && pnpm test` — fix any test failures introduced by this PR.
3. If fixes are needed, apply them directly. Don't just report — converge.
