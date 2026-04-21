---
id: 009-extract-display-pkg
title: "PR8 — Extract @converge/display workspace package"
blocking: true
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js"
vars:
  taskId: 009-extract-display-pkg
  title: "PR8 — Extract @converge/display workspace package"
  tier: 3 — Leaf primitives
  task: "Move cli/display/* to packages/display/. Zero runtime deps. Consumed only by CLI (pre-PR13) — a future web UI supplies its own renderer."
  spec: "Create `packages/display/` workspace package — a **terminal/ANSI renderer**, not a general formatting lib.\n\n**Source (git mv):** `packages/core/src/cli/display/*` → `packages/display/src/`\n\n**Package shape:**\n- `package.json` — name `@converge/display`, `dependencies: {}` (zero)\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `src/index.ts` — exports `printTaskTree`, `formatInspectSession`, `ProgressLogger`, color/box helpers\n\n**Layering invariant — HARD RULE:**\n\n`@converge/display` is consumed **only** by `@converge/cli` (post-PR13). Pre-PR13, it's consumed by `packages/core/src/cli/` — that's fine because cli/ is moving to `@converge/cli` later.\n\nIt must NOT appear in:\n- `packages/core/package.json` dependencies (temporarily added pre-PR13; removed in PR13)\n- any import in `packages/core/src/` outside `cli/`\n- any import in `packages/scheduler/src/`, `packages/journal/src/`, `packages/navigator/src/`\n- any import in `packages/engine/src/` (post-PR11)\n\n**Core side (temporary wiring):**\n- `packages/core/package.json` adds `\"@converge/display\": \"workspace:*\"` (will be removed in PR13 when cli/ leaves core)\n- Update imports in `packages/core/src/cli/` from `./display/*` → `@converge/display`\n\n**Layering audits (REJECT on hit):**\n```bash\n# No cross-package display leakage\ngrep -rn \"@converge/display\" packages/core/src | grep -v \"packages/core/src/cli/\" && exit 1 || true\ngrep -rn \"@converge/display\" packages/scheduler/src packages/journal/src packages/navigator/src 2>/dev/null && exit 1 || true\n\n# Display is zero-dep\ntest -z \"$(node -e \"const d=require('./packages/display/package.json').dependencies||{};console.log(Object.keys(d).join('\\n'))\")\"\n```\n\n**Acceptance:**\n- All 3 layering audits clean\n- `pnpm -r build` + `pnpm -r test` green\n- `pnpm install` from clean state — no phantom deps\n- `@converge/display` tests run in isolation\n- `madge --circular packages/display/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg"
  itemTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js\""
---

# PR8 — Extract @converge/display workspace package

**Tier:** 3 — Leaf primitives

**Summary:** Move cli/display/* to packages/display/. Zero runtime deps. Consumed only by CLI (pre-PR13) — a future web UI supplies its own renderer.

## Full specification

Create `packages/display/` workspace package — a **terminal/ANSI renderer**, not a general formatting lib.

**Source (git mv):** `packages/core/src/cli/display/*` → `packages/display/src/`

**Package shape:**
- `package.json` — name `@converge/display`, `dependencies: {}` (zero)
- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- `src/index.ts` — exports `printTaskTree`, `formatInspectSession`, `ProgressLogger`, color/box helpers

**Layering invariant — HARD RULE:**

`@converge/display` is consumed **only** by `@converge/cli` (post-PR13). Pre-PR13, it's consumed by `packages/core/src/cli/` — that's fine because cli/ is moving to `@converge/cli` later.

It must NOT appear in:
- `packages/core/package.json` dependencies (temporarily added pre-PR13; removed in PR13)
- any import in `packages/core/src/` outside `cli/`
- any import in `packages/scheduler/src/`, `packages/journal/src/`, `packages/navigator/src/`
- any import in `packages/engine/src/` (post-PR11)

**Core side (temporary wiring):**
- `packages/core/package.json` adds `"@converge/display": "workspace:*"` (will be removed in PR13 when cli/ leaves core)
- Update imports in `packages/core/src/cli/` from `./display/*` → `@converge/display`

**Layering audits (REJECT on hit):**
```bash
# No cross-package display leakage
grep -rn "@converge/display" packages/core/src | grep -v "packages/core/src/cli/" && exit 1 || true
grep -rn "@converge/display" packages/scheduler/src packages/journal/src packages/navigator/src 2>/dev/null && exit 1 || true

# Display is zero-dep
test -z "$(node -e "const d=require('./packages/display/package.json').dependencies||{};console.log(Object.keys(d).join('\n'))")"
```

**Acceptance:**
- All 3 layering audits clean
- `pnpm -r build` + `pnpm -r test` green
- `pnpm install` from clean state — no phantom deps
- `@converge/display` tests run in isolation
- `madge --circular packages/display/src` — no cycles

---

Runs the full pipeline: **analyze → implement → review → quality**.
