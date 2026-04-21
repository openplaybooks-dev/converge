---
id: 010-extract-display-pkg
title: "PR10 — Extract @converge/display workspace package"
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 010-extract-display-pkg
  title: "PR10 — Extract @converge/display workspace package"
  tier: B
  task: "Move cli/display/* into its own package. Terminal-only renderer — never imported by core."
  spec: "Create `packages/display/` workspace package — a **terminal/ANSI renderer**, not a general formatting lib.\n\n**Source:** `packages/core/src/cli/display/*` (location from PR7)\n\n**Package shape:**\n- `packages/display/package.json` — name `@converge/display`, deps: none (pure formatting with ANSI)\n- `packages/display/tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `packages/display/src/index.ts` — exports `printTaskTree`, `formatInspectSession`, `ProgressLogger`, color/box helpers\n\n**Layering invariant — HARD RULE:**\n`@converge/display` is consumed **only** by `@converge/cli`.\nIt must NOT appear in:\n- `packages/core/package.json` dependencies\n- any `import` in `packages/core/src/**`\n- any `import` in `packages/scheduler/src/**` or `packages/journal/src/**` (once those exist)\n\nA future web UI will supply its own renderer against `@converge/core`. This split is what makes that possible.\n\n**Audit of current import sites:** anything in `packages/core/src/cli/` that imports `./display/*` is fine to keep — those files become part of `@converge/cli` in PR13. But if any `display/*` import exists in `packages/core/src/` **outside** the `cli/` subtree (e.g. from `orchestrator/`, `tree/`, `checkpoint/`), that's the bug — refactor it out **before** extracting the package:\n\n```bash\n# Must return nothing. Any hit is a layering violation that PR10 must fix, not inherit.\ngrep -rn \"from.*cli/display\\|from.*['\\\"]\\.\\./display\" packages/core/src \\\n  | grep -v \"packages/core/src/cli/\"\n```\n\n**Core side:**\n- Remove `packages/core/src/cli/display/` from core's `files` + tsup entry\n- `packages/core/package.json` adds `\"@converge/display\": \"workspace:*\"` — but only if core's `cli/` still lives in core (pre-PR13). Remove it again in PR13.\n- Update all import sites in `packages/core/src/cli/`: `./display/X` → `@converge/display`\n\n**Acceptance:**\n- `pnpm -r build` + `pnpm -r test` green\n- `pnpm install` from clean state — no phantom deps\n- `@converge/display` tests run in isolation (proves containment)\n- **Layering audit**: `grep -rn \"@converge/display\" packages/core/src` returns only matches inside `packages/core/src/cli/`. Zero matches in `orchestrator/`, `tree/`, `checkpoint/`, `journal/`, or at the root of `src/`."
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\010-extract-display-pkg"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR10 — Extract @converge/display workspace package

**Tier:** B

**Summary:** Move cli/display/* into its own package. Terminal-only renderer — never imported by core.

## Full specification

Create `packages/display/` workspace package — a **terminal/ANSI renderer**, not a general formatting lib.

**Source:** `packages/core/src/cli/display/*` (location from PR7)

**Package shape:**
- `packages/display/package.json` — name `@converge/display`, deps: none (pure formatting with ANSI)
- `packages/display/tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- `packages/display/src/index.ts` — exports `printTaskTree`, `formatInspectSession`, `ProgressLogger`, color/box helpers

**Layering invariant — HARD RULE:**
`@converge/display` is consumed **only** by `@converge/cli`.
It must NOT appear in:
- `packages/core/package.json` dependencies
- any `import` in `packages/core/src/**`
- any `import` in `packages/scheduler/src/**` or `packages/journal/src/**` (once those exist)

A future web UI will supply its own renderer against `@converge/core`. This split is what makes that possible.

**Audit of current import sites:** anything in `packages/core/src/cli/` that imports `./display/*` is fine to keep — those files become part of `@converge/cli` in PR13. But if any `display/*` import exists in `packages/core/src/` **outside** the `cli/` subtree (e.g. from `orchestrator/`, `tree/`, `checkpoint/`), that's the bug — refactor it out **before** extracting the package:

```bash
# Must return nothing. Any hit is a layering violation that PR10 must fix, not inherit.
grep -rn "from.*cli/display\|from.*['\"]\.\./display" packages/core/src \
  | grep -v "packages/core/src/cli/"
```

**Core side:**
- Remove `packages/core/src/cli/display/` from core's `files` + tsup entry
- `packages/core/package.json` adds `"@converge/display": "workspace:*"` — but only if core's `cli/` still lives in core (pre-PR13). Remove it again in PR13.
- Update all import sites in `packages/core/src/cli/`: `./display/X` → `@converge/display`

**Acceptance:**
- `pnpm -r build` + `pnpm -r test` green
- `pnpm install` from clean state — no phantom deps
- `@converge/display` tests run in isolation (proves containment)
- **Layering audit**: `grep -rn "@converge/display" packages/core/src` returns only matches inside `packages/core/src/cli/`. Zero matches in `orchestrator/`, `tree/`, `checkpoint/`, `journal/`, or at the root of `src/`.

---

Runs the full pipeline: **analyze → implement → review → quality**.
