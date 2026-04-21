---
id: 006-split-commands
title: PR6 — Split cli/commands.ts
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 006-split-commands
  title: PR6 — Split cli/commands.ts
  tier: A
  task: Break the 1268-line commands.ts into per-command modules.
  spec: "Split `packages/core/src/cli/commands.ts` into:\n\n| New file | Contents |\n| --- | --- |\n| `cli/commands/init.ts` (~370L) | `initCommand` (L95–368) |\n| `cli/commands/plugins.ts` (~20L) | `pluginsCommand` |\n| `cli/commands/checkpoint.ts` (~260L) | `checkpointCommand` (L749–1006) |\n| `cli/commands/legacy-run-status.ts` (~300L) | `runCommand`, `resumeCommand`, `statusCommand`, `addGoal`, `removeGoal`, `resetCommand` (V2 wrappers kept together) |\n\n**Rules:**\n- Delete `cli/commands.ts` entirely. No re-export shim.\n- Update `cli/main.ts` imports to the new paths.\n- If legacy wrappers are verifiably unused, delete them in this PR (do not leave for later).\n\n**Acceptance:**\n- `cli/commands.ts` no longer exists\n- PR1 init suite green\n- `pnpm typecheck` + `pnpm test` green\n- Smoke: `converge init --yes` in a temp dir, `converge plugins`, `converge checkpoint --help`"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\006-split-commands"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR6 — Split cli/commands.ts

**Tier:** A

**Summary:** Break the 1268-line commands.ts into per-command modules.

## Full specification

Split `packages/core/src/cli/commands.ts` into:

| New file | Contents |
| --- | --- |
| `cli/commands/init.ts` (~370L) | `initCommand` (L95–368) |
| `cli/commands/plugins.ts` (~20L) | `pluginsCommand` |
| `cli/commands/checkpoint.ts` (~260L) | `checkpointCommand` (L749–1006) |
| `cli/commands/legacy-run-status.ts` (~300L) | `runCommand`, `resumeCommand`, `statusCommand`, `addGoal`, `removeGoal`, `resetCommand` (V2 wrappers kept together) |

**Rules:**
- Delete `cli/commands.ts` entirely. No re-export shim.
- Update `cli/main.ts` imports to the new paths.
- If legacy wrappers are verifiably unused, delete them in this PR (do not leave for later).

**Acceptance:**
- `cli/commands.ts` no longer exists
- PR1 init suite green
- `pnpm typecheck` + `pnpm test` green
- Smoke: `converge init --yes` in a temp dir, `converge plugins`, `converge checkpoint --help`

---

Runs the full pipeline: **analyze → implement → review → quality**.
