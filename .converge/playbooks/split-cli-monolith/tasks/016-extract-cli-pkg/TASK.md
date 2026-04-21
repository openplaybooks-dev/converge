---
id: 016-extract-cli-pkg
title: "PR13 — Extract @converge/cli workspace package"
blocking: true
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js"
vars:
  taskId: 016-extract-cli-pkg
  title: "PR13 — Extract @converge/cli workspace package"
  tier: 5 — CLI outer shell
  task: "Move cli/* to packages/cli/. Ship converge bin from the new package. Remove bin + cli/ from core."
  spec: "Create `packages/cli/` workspace package. The outer layer of the onion.\n\n**Source (git mv):** `packages/core/src/cli/*` → `packages/cli/src/`\n\n**Deps:**\n- `@converge/engine` (workspace:*)\n- `@converge/display` (workspace:*)\n- `@converge/journal` (workspace:*)\n- `@converge/scheduler` (workspace:*)\n- `@converge/core` (workspace:*) — for types (gap, goal, config)\n\n**Package shape:**\n- `package.json` with `\"bin\": { \"converge\": \"./dist/main.js\" }`\n- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n- `src/main.ts` (entry), `src/args/`, `src/bootstrap/`, `src/dispatch/`, `src/commands/`\n\n**Core side hard breaks:**\n- `packages/core/package.json` **removes** `\"bin\"` entry\n- `packages/core/package.json` **removes** `\"@converge/display\"` from dependencies (display is CLI-only)\n- `packages/core/tsup.config.ts` **removes** the CLI entry\n- `packages/core/src/cli/` directory **deleted**\n- `packages/core/src/index.ts` — no CLI-related exports (already done in PR11c/PR12)\n\n**Layering invariants (HARD REJECT on violation):**\n\n```bash\n# No cli layer imports in engine/primitives\ngrep -rn \"@converge/cli\" packages/engine/src packages/core/src packages/journal/src packages/scheduler/src packages/navigator/src packages/display/src 2>/dev/null && exit 1 || true\n\n# No process.exit / stdout writes outside CLI\ngrep -rnE \"process\\\\.exit\\\\|process\\\\.stdout\\\\.write\" packages/engine/src packages/core/src && exit 1 || true\ngrep -rnE \"console\\\\.(log|error|warn|info)\" packages/engine/src packages/core/src | grep -v \".test.ts\" && exit 1 || true\n\n# CLI bin works post-extraction\nnode packages/cli/dist/main.js --help >/dev/null 2>&1 || exit 1\n```\n\n**Smoke matrix (must pass):**\n```bash\nconverge --help                  # via new bin\nconverge status\nconverge verify\nconverge run --dry --max-iterations=1 --playbook=default\nconverge show gantt && converge show graph\nconverge inspect\nconverge plan \"test\" --dry\n```\n\nPlus SIGINT test: `converge run` + Ctrl-C → exits within 10s, no zombie processes.\n\n**Downstream verification:**\n- swebench + tbench depend on `@converge/core` + `@converge/engine` only — re-run their tests to confirm no CLI dependency leaked\n\n**Acceptance:**\n- All layering audits clean\n- Full smoke matrix passes from new bin\n- swebench + tbench tests green\n- SIGINT test passes\n- `pnpm install` from clean state — no phantom deps\n- `pnpm -r build` + `pnpm -r test` green\n- `madge --circular packages/cli/src` — no cycles"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/016-extract-cli-pkg"
  itemTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js\""
---

# PR13 — Extract @converge/cli workspace package

**Tier:** 5 — CLI outer shell

**Summary:** Move cli/* to packages/cli/. Ship converge bin from the new package. Remove bin + cli/ from core.

## Full specification

Create `packages/cli/` workspace package. The outer layer of the onion.

**Source (git mv):** `packages/core/src/cli/*` → `packages/cli/src/`

**Deps:**
- `@converge/engine` (workspace:*)
- `@converge/display` (workspace:*)
- `@converge/journal` (workspace:*)
- `@converge/scheduler` (workspace:*)
- `@converge/core` (workspace:*) — for types (gap, goal, config)

**Package shape:**
- `package.json` with `"bin": { "converge": "./dist/main.js" }`
- `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- `src/main.ts` (entry), `src/args/`, `src/bootstrap/`, `src/dispatch/`, `src/commands/`

**Core side hard breaks:**
- `packages/core/package.json` **removes** `"bin"` entry
- `packages/core/package.json` **removes** `"@converge/display"` from dependencies (display is CLI-only)
- `packages/core/tsup.config.ts` **removes** the CLI entry
- `packages/core/src/cli/` directory **deleted**
- `packages/core/src/index.ts` — no CLI-related exports (already done in PR11c/PR12)

**Layering invariants (HARD REJECT on violation):**

```bash
# No cli layer imports in engine/primitives
grep -rn "@converge/cli" packages/engine/src packages/core/src packages/journal/src packages/scheduler/src packages/navigator/src packages/display/src 2>/dev/null && exit 1 || true

# No process.exit / stdout writes outside CLI
grep -rnE "process\\.exit\\|process\\.stdout\\.write" packages/engine/src packages/core/src && exit 1 || true
grep -rnE "console\\.(log|error|warn|info)" packages/engine/src packages/core/src | grep -v ".test.ts" && exit 1 || true

# CLI bin works post-extraction
node packages/cli/dist/main.js --help >/dev/null 2>&1 || exit 1
```

**Smoke matrix (must pass):**
```bash
converge --help                  # via new bin
converge status
converge verify
converge run --dry --max-iterations=1 --playbook=default
converge show gantt && converge show graph
converge inspect
converge plan "test" --dry
```

Plus SIGINT test: `converge run` + Ctrl-C → exits within 10s, no zombie processes.

**Downstream verification:**
- swebench + tbench depend on `@converge/core` + `@converge/engine` only — re-run their tests to confirm no CLI dependency leaked

**Acceptance:**
- All layering audits clean
- Full smoke matrix passes from new bin
- swebench + tbench tests green
- SIGINT test passes
- `pnpm install` from clean state — no phantom deps
- `pnpm -r build` + `pnpm -r test` green
- `madge --circular packages/cli/src` — no cycles

---

Runs the full pipeline: **analyze → implement → review → quality**.
