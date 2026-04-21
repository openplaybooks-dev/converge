---
id: 001-plan
title: Plan implementation — PR6 — Slim cli/main.ts and cli/commands.ts
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/007-split-commands-main/implement/plan.md"
vars:
  taskId: 001-plan
  title: PR6 — Slim cli/main.ts and cli/commands.ts
  task: "Extract cli/args/, cli/bootstrap/, cli/dispatch/ from main.ts. Split commands.ts into per-command files. Delete commands.ts."
  spec: "Decompose the two remaining CLI monoliths: `main.ts` (1280 L) and `commands.ts` (1268 L).\n\n**main.ts extractions:**\n\n| New file                          | Lines | Source range                                                                 |\n| --------------------------------- | ----- | ---------------------------------------------------------------------------- |\n| `cli/args/parse.ts`               | ~120  | `parseArgs`                                                                   |\n| `cli/args/redirects.ts`           | ~40   | `REDIRECTS` map + handler                                                     |\n| `cli/bootstrap/shutdown.ts`       | ~60   | `shutdownController` singleton + `setupGracefulShutdown` (named const export — do not re-create per call) |\n| `cli/bootstrap/scope.ts`          | ~90   | 3-strategy playbook auto-detect (order-sensitive — preserve exactly; sets `CONVERGE_PLAYBOOK` env) |\n| `cli/bootstrap/entry.ts`          | ~30   | Windows `_isMain` guard (keep `realpathSync` + `pathToFileURL` fallback verbatim) |\n| `cli/dispatch/run.ts`             | ~250  | \"run\" case incl. `--playbook` wrapper                                         |\n| `cli/dispatch/plan.ts`            | ~180  | \"plan\" case + `buildPlanTaskMd`                                               |\n| `cli/dispatch/show.ts`            | ~60   | \"show\" case                                                                   |\n| `cli/dispatch/skills.ts`          | ~30   | \"skills\" case                                                                  |\n| `cli/dispatch/playbook.ts`        | ~40   | \"playbook\" case                                                                |\n| `cli/dispatch/simple.ts`          | ~150  | remaining subcommand routers                                                   |\n\nAfter this PR, `cli/main.ts` ≤250 lines — only imports, top-level try/catch, dispatch switch calling into modules. **Keep `process.env.PYTHONIOENCODING` line at the top of `main.ts` — do not move.**\n\n**commands.ts split (delete original):**\n\n| New file                                 | Lines | Contents                                                                    |\n| ---------------------------------------- | ----- | --------------------------------------------------------------------------- |\n| `cli/commands/init.ts`                   | ~370  | `initCommand`                                                                |\n| `cli/commands/plugins.ts`                | ~20   | `pluginsCommand`                                                             |\n| `cli/commands/checkpoint.ts`             | ~260  | `checkpointCommand`                                                          |\n| `cli/commands/legacy-run-status.ts`      | ~300  | `runCommand`, `resumeCommand`, `statusCommand`, `addGoal`, `removeGoal`, `resetCommand` (V2 wrappers; delete if verifiably unused) |\n\n`commands.ts` deleted. `main.ts` imports update to the new paths.\n\n**Smoke matrix (must match pre-PR baseline):**\n```bash\nconverge --help\nconverge status\nconverge verify\nconverge run --dry --max-iterations=1 --playbook=default\nconverge show gantt && converge show graph\nconverge inspect\nconverge plan \"test prompt\" --dry\n```\n\nPlus SIGINT during `converge run` → exits within 10s, no zombie children.\n\n**Acceptance:**\n- PR1 parseArgs, scope, init suites green\n- `cli/main.ts` ≤300 lines; `cli/commands.ts` deleted\n- Smoke matrix matches pre-PR output exactly (capture baseline before, diff after)\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/007-split-commands-main"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR6 — Slim cli/main.ts and cli/commands.ts

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/007-split-commands-main/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/007-split-commands-main/implement/plan.md`:

```markdown
# PR6 — Slim cli/main.ts and cli/commands.ts — Implementation Plan

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
