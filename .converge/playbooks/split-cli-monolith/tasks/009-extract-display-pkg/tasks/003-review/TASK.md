---
id: 003-review
title: "Review — PR8 — Extract @converge/display workspace package"
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg/review/report.md"
vars:
  taskId: 003-review
  parentId: 009-extract-display-pkg
  title: "PR8 — Extract @converge/display workspace package"
  tier: 3 — Leaf primitives
  task: "Move cli/display/* to packages/display/. Zero runtime deps. Consumed only by CLI (pre-PR13) — a future web UI supplies its own renderer."
  spec: "Create `packages/display/` workspace package — a **terminal/ANSI renderer**, not a general formatting lib.\n\n**Source (git mv):** `packages/core/src/cli/display/*` → `packages/display/src/`\n\n**Package shape:**\n- `package.json` — name `@converge/display`, `dependencies: {}` (zero)\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `src/index.ts` — exports `printTaskTree`, `formatInspectSession`, `ProgressLogger`, color/box helpers\n\n**Layering invariant — HARD RULE:**\n\n`@converge/display` is consumed **only** by `@converge/cli` (post-PR13). Pre-PR13, it's consumed by `packages/core/src/cli/` — that's fine because cli/ is moving to `@converge/cli` later.\n\nIt must NOT appear in:\n- `packages/core/package.json` dependencies (temporarily added pre-PR13; removed in PR13)\n- any import in `packages/core/src/` outside `cli/`\n- any import in `packages/scheduler/src/`, `packages/journal/src/`, `packages/navigator/src/`\n- any import in `packages/engine/src/` (post-PR11)\n\n**Core side (temporary wiring):**\n- `packages/core/package.json` adds `\"@converge/display\": \"workspace:*\"` (will be removed in PR13 when cli/ leaves core)\n- Update imports in `packages/core/src/cli/` from `./display/*` → `@converge/display`\n\n**Layering audits (REJECT on hit):**\n```bash\n# No cross-package display leakage\ngrep -rn \"@converge/display\" packages/core/src | grep -v \"packages/core/src/cli/\" && exit 1 || true\ngrep -rn \"@converge/display\" packages/scheduler/src packages/journal/src packages/navigator/src 2>/dev/null && exit 1 || true\n\n# Display is zero-dep\ntest -z \"$(node -e \"const d=require('./packages/display/package.json').dependencies||{};console.log(Object.keys(d).join('\\n'))\")\"\n```\n\n**Acceptance:**\n- All 3 layering audits clean\n- `pnpm -r build` + `pnpm -r test` green\n- `pnpm install` from clean state — no phantom deps\n- `@converge/display` tests run in isolation\n- `madge --circular packages/display/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR8 — Extract @converge/display workspace package

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Move cli/display/* to packages/display/. Zero runtime deps. Consumed only by CLI (pre-PR13) — a future web UI supplies its own renderer.
- **Full spec:**

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

- Analysis: `D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg/implement/plan.md`

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

Write `D:/converge/.converge/artifacts/split-cli/009-extract-display-pkg/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
