---
id: 013-extract-cli-pkg
title: "PR13 — Extract @converge/cli workspace package"
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 013-extract-cli-pkg
  title: "PR13 — Extract @converge/cli workspace package"
  tier: B
  task: "Move cli/* into its own package. Core becomes a pure programmatic library — web-UI-ready."
  spec: "Create `packages/cli/` workspace package. `@converge/core` becomes a **pure programmatic library** — no CLI leakage, no stdout writes, no `process.exit`. A future web UI imports core directly and supplies its own I/O.\n\n**Source:** `packages/core/src/cli/*`\n\n**Deps:**\n- `@converge/core` (workspace:*) — programmatic interface\n- `@converge/display` (workspace:*) — terminal renderer\n- `@converge/scheduler` (workspace:*)\n- `@converge/journal` (workspace:*)\n\n**Package shape:**\n- `packages/cli/package.json` with `\"bin\": { \"converge\": \"./dist/main.js\" }`\n- `packages/cli/tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`\n\n**Core side hard breaks (per user decision — no shims):**\n- `packages/core/package.json` **removes** the `bin` entry and **removes** `\"@converge/display\"` from dependencies (display is CLI-only)\n- `packages/core/tsup.config.ts` **removes** the CLI entry\n- `packages/core/src/cli/` directory **deleted**\n- `packages/core/src/index.ts` **stops** re-exporting `autonomousRun`; programmatic consumers import from `@converge/core/orchestrator/autonomous` directly\n\n**Programmatic API surface of `@converge/core` (post-PR13):**\n\nWhatever a web UI or an embedder would reasonably need must be reachable without importing `@converge/cli`. Enumerate and verify:\n\n| Capability              | Programmatic entry                                          |\n| ----------------------- | ----------------------------------------------------------- |\n| Run a playbook          | `autonomousRun(config): Promise<AutonomousRunResult>`     |\n| Load a playbook         | playbook loader exports                                     |\n| Query task tree state   | via `@converge/scheduler` (`findNextTask`, `getTaskStates`) |\n| Read/write checkpoints  | via `@converge/journal` (`CheckpointManager` et al.)    |\n| Resume/recover a run    | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks` |\n| Session logging         | `SessionLogger` from `@converge/journal`                |\n\nEach of these must accept I/O-agnostic inputs (config objects, paths, callbacks) and return data structures. No `console.log`, no `process.stdout.write`, no `process.exit`, no `readline` inside `@converge/core`.\n\n**Layering audit — MUST PASS as checks:**\n\n```bash\n# 1. No process.exit in core (only cli may exit the process)\ngrep -rn \"process\\.exit\" packages/core/src && exit 1 || true\n\n# 2. No stdout/stderr writes from core\ngrep -rn \"process\\.stdout\\.write\\|process\\.stderr\\.write\" packages/core/src && exit 1 || true\n\n# 3. No console.log / console.error in core (warnings via throw or structured logger callbacks only)\ngrep -rn \"console\\.\\(log\\|error\\|warn\\|info\\)\" packages/core/src | grep -v \".test.ts\" && exit 1 || true\n\n# 4. No ANSI escape literals in core\ngrep -rn \"\\\\u001b\\[\\|\\\\x1b\\[\" packages/core/src && exit 1 || true\n\n# 5. Core does NOT depend on display or cli\ngrep -n \"@converge/display\\|@converge/cli\" packages/core/package.json && exit 1 || true\n```\n\nIf any of the above fires, the offending code is CLI-flavored behavior that should live in `@converge/cli`. Fix the violation (move the behavior, inject a callback, or return data) — don't add a suppression.\n\n**Downstream verification:**\n- swebench + tbench still depend on `@converge/core` only — re-run their tests. If either starts needing `@converge/cli`, the API surface is wrong.\n- `npx converge --help` from `@converge/cli` dist runs the bin\n- **Smoke test programmatic usage:** write a ~30-line standalone Node script that `import`s `@converge/core` and runs `autonomousRun` against a fixture playbook with zero `@converge/cli` imports. Keep it in `packages/core/tests/smoke/programmatic.test.ts`. This is the web UI's integration pattern — if the script works, the web UI will too.\n\n**Acceptance:**\n- All 5 layering audits above return clean\n- Programmatic smoke test passes\n- `pnpm -r build` + `pnpm -r test` green across all packages\n- `pnpm install` from clean state — no phantom deps\n- Full smoke matrix on `converge` bin (every subcommand)\n- SIGINT test still green"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\013-extract-cli-pkg"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR13 — Extract @converge/cli workspace package

**Tier:** B

**Summary:** Move cli/* into its own package. Core becomes a pure programmatic library — web-UI-ready.

## Full specification

Create `packages/cli/` workspace package. `@converge/core` becomes a **pure programmatic library** — no CLI leakage, no stdout writes, no `process.exit`. A future web UI imports core directly and supplies its own I/O.

**Source:** `packages/core/src/cli/*`

**Deps:**
- `@converge/core` (workspace:*) — programmatic interface
- `@converge/display` (workspace:*) — terminal renderer
- `@converge/scheduler` (workspace:*)
- `@converge/journal` (workspace:*)

**Package shape:**
- `packages/cli/package.json` with `"bin": { "converge": "./dist/main.js" }`
- `packages/cli/tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`

**Core side hard breaks (per user decision — no shims):**
- `packages/core/package.json` **removes** the `bin` entry and **removes** `"@converge/display"` from dependencies (display is CLI-only)
- `packages/core/tsup.config.ts` **removes** the CLI entry
- `packages/core/src/cli/` directory **deleted**
- `packages/core/src/index.ts` **stops** re-exporting `autonomousRun`; programmatic consumers import from `@converge/core/orchestrator/autonomous` directly

**Programmatic API surface of `@converge/core` (post-PR13):**

Whatever a web UI or an embedder would reasonably need must be reachable without importing `@converge/cli`. Enumerate and verify:

| Capability              | Programmatic entry                                          |
| ----------------------- | ----------------------------------------------------------- |
| Run a playbook          | `autonomousRun(config): Promise<AutonomousRunResult>`     |
| Load a playbook         | playbook loader exports                                     |
| Query task tree state   | via `@converge/scheduler` (`findNextTask`, `getTaskStates`) |
| Read/write checkpoints  | via `@converge/journal` (`CheckpointManager` et al.)    |
| Resume/recover a run    | `detectStuckTasks`, `recoverStuckTasks`, `resetAllTasks` |
| Session logging         | `SessionLogger` from `@converge/journal`                |

Each of these must accept I/O-agnostic inputs (config objects, paths, callbacks) and return data structures. No `console.log`, no `process.stdout.write`, no `process.exit`, no `readline` inside `@converge/core`.

**Layering audit — MUST PASS as checks:**

```bash
# 1. No process.exit in core (only cli may exit the process)
grep -rn "process\.exit" packages/core/src && exit 1 || true

# 2. No stdout/stderr writes from core
grep -rn "process\.stdout\.write\|process\.stderr\.write" packages/core/src && exit 1 || true

# 3. No console.log / console.error in core (warnings via throw or structured logger callbacks only)
grep -rn "console\.\(log\|error\|warn\|info\)" packages/core/src | grep -v ".test.ts" && exit 1 || true

# 4. No ANSI escape literals in core
grep -rn "\\u001b\[\|\\x1b\[" packages/core/src && exit 1 || true

# 5. Core does NOT depend on display or cli
grep -n "@converge/display\|@converge/cli" packages/core/package.json && exit 1 || true
```

If any of the above fires, the offending code is CLI-flavored behavior that should live in `@converge/cli`. Fix the violation (move the behavior, inject a callback, or return data) — don't add a suppression.

**Downstream verification:**
- swebench + tbench still depend on `@converge/core` only — re-run their tests. If either starts needing `@converge/cli`, the API surface is wrong.
- `npx converge --help` from `@converge/cli` dist runs the bin
- **Smoke test programmatic usage:** write a ~30-line standalone Node script that `import`s `@converge/core` and runs `autonomousRun` against a fixture playbook with zero `@converge/cli` imports. Keep it in `packages/core/tests/smoke/programmatic.test.ts`. This is the web UI's integration pattern — if the script works, the web UI will too.

**Acceptance:**
- All 5 layering audits above return clean
- Programmatic smoke test passes
- `pnpm -r build` + `pnpm -r test` green across all packages
- `pnpm install` from clean state — no phantom deps
- Full smoke matrix on `converge` bin (every subcommand)
- SIGINT test still green

---

Runs the full pipeline: **analyze → implement → review → quality**.
