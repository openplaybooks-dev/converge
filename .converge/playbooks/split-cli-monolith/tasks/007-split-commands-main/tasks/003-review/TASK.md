---
id: 003-review
title: Review — PR6 — Slim cli/main.ts and cli/commands.ts
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/007-split-commands-main/review/report.md"
vars:
  taskId: 003-review
  parentId: 007-split-commands-main
  title: PR6 — Slim cli/main.ts and cli/commands.ts
  tier: 2 — In-core reorg
  task: "Extract cli/args/, cli/bootstrap/, cli/dispatch/ from main.ts. Split commands.ts into per-command files. Delete commands.ts."
  spec: "Decompose the two remaining CLI monoliths: `main.ts` (1280 L) and `commands.ts` (1268 L).\n\n**main.ts extractions:**\n\n| New file                          | Lines | Source range                                                                 |\n| --------------------------------- | ----- | ---------------------------------------------------------------------------- |\n| `cli/args/parse.ts`               | ~120  | `parseArgs`                                                                   |\n| `cli/args/redirects.ts`           | ~40   | `REDIRECTS` map + handler                                                     |\n| `cli/bootstrap/shutdown.ts`       | ~60   | `shutdownController` singleton + `setupGracefulShutdown` (named const export — do not re-create per call) |\n| `cli/bootstrap/scope.ts`          | ~90   | 3-strategy playbook auto-detect (order-sensitive — preserve exactly; sets `CONVERGE_PLAYBOOK` env) |\n| `cli/bootstrap/entry.ts`          | ~30   | Windows `_isMain` guard (keep `realpathSync` + `pathToFileURL` fallback verbatim) |\n| `cli/dispatch/run.ts`             | ~250  | \"run\" case incl. `--playbook` wrapper                                         |\n| `cli/dispatch/plan.ts`            | ~180  | \"plan\" case + `buildPlanTaskMd`                                               |\n| `cli/dispatch/show.ts`            | ~60   | \"show\" case                                                                   |\n| `cli/dispatch/skills.ts`          | ~30   | \"skills\" case                                                                  |\n| `cli/dispatch/playbook.ts`        | ~40   | \"playbook\" case                                                                |\n| `cli/dispatch/simple.ts`          | ~150  | remaining subcommand routers                                                   |\n\nAfter this PR, `cli/main.ts` ≤250 lines — only imports, top-level try/catch, dispatch switch calling into modules. **Keep `process.env.PYTHONIOENCODING` line at the top of `main.ts` — do not move.**\n\n**commands.ts split (delete original):**\n\n| New file                                 | Lines | Contents                                                                    |\n| ---------------------------------------- | ----- | --------------------------------------------------------------------------- |\n| `cli/commands/init.ts`                   | ~370  | `initCommand`                                                                |\n| `cli/commands/plugins.ts`                | ~20   | `pluginsCommand`                                                             |\n| `cli/commands/checkpoint.ts`             | ~260  | `checkpointCommand`                                                          |\n| `cli/commands/legacy-run-status.ts`      | ~300  | `runCommand`, `resumeCommand`, `statusCommand`, `addGoal`, `removeGoal`, `resetCommand` (V2 wrappers; delete if verifiably unused) |\n\n`commands.ts` deleted. `main.ts` imports update to the new paths.\n\n**Smoke matrix (must match pre-PR baseline):**\n```bash\nconverge --help\nconverge status\nconverge verify\nconverge run --dry --max-iterations=1 --playbook=default\nconverge show gantt && converge show graph\nconverge inspect\nconverge plan \"test prompt\" --dry\n```\n\nPlus SIGINT during `converge run` → exits within 10s, no zombie children.\n\n**Acceptance:**\n- PR1 parseArgs, scope, init suites green\n- `cli/main.ts` ≤300 lines; `cli/commands.ts` deleted\n- Smoke matrix matches pre-PR output exactly (capture baseline before, diff after)\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/007-split-commands-main"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR6 — Slim cli/main.ts and cli/commands.ts

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Extract cli/args/, cli/bootstrap/, cli/dispatch/ from main.ts. Split commands.ts into per-command files. Delete commands.ts.
- **Full spec:**

Decompose the two remaining CLI monoliths: `main.ts` (1280 L) and `commands.ts` (1268 L).

**main.ts extractions:**

| New file                          | Lines | Source range                                                                 |
| --------------------------------- | ----- | ---------------------------------------------------------------------------- |
| `cli/args/parse.ts`               | ~120  | `parseArgs`                                                                   |
| `cli/args/redirects.ts`           | ~40   | `REDIRECTS` map + handler                                                     |
| `cli/bootstrap/shutdown.ts`       | ~60   | `shutdownController` singleton + `setupGracefulShutdown` (named const export — do not re-create per call) |
| `cli/bootstrap/scope.ts`          | ~90   | 3-strategy playbook auto-detect (order-sensitive — preserve exactly; sets `CONVERGE_PLAYBOOK` env) |
| `cli/bootstrap/entry.ts`          | ~30   | Windows `_isMain` guard (keep `realpathSync` + `pathToFileURL` fallback verbatim) |
| `cli/dispatch/run.ts`             | ~250  | "run" case incl. `--playbook` wrapper                                         |
| `cli/dispatch/plan.ts`            | ~180  | "plan" case + `buildPlanTaskMd`                                               |
| `cli/dispatch/show.ts`            | ~60   | "show" case                                                                   |
| `cli/dispatch/skills.ts`          | ~30   | "skills" case                                                                  |
| `cli/dispatch/playbook.ts`        | ~40   | "playbook" case                                                                |
| `cli/dispatch/simple.ts`          | ~150  | remaining subcommand routers                                                   |

After this PR, `cli/main.ts` ≤250 lines — only imports, top-level try/catch, dispatch switch calling into modules. **Keep `process.env.PYTHONIOENCODING` line at the top of `main.ts` — do not move.**

**commands.ts split (delete original):**

| New file                                 | Lines | Contents                                                                    |
| ---------------------------------------- | ----- | --------------------------------------------------------------------------- |
| `cli/commands/init.ts`                   | ~370  | `initCommand`                                                                |
| `cli/commands/plugins.ts`                | ~20   | `pluginsCommand`                                                             |
| `cli/commands/checkpoint.ts`             | ~260  | `checkpointCommand`                                                          |
| `cli/commands/legacy-run-status.ts`      | ~300  | `runCommand`, `resumeCommand`, `statusCommand`, `addGoal`, `removeGoal`, `resetCommand` (V2 wrappers; delete if verifiably unused) |

`commands.ts` deleted. `main.ts` imports update to the new paths.

**Smoke matrix (must match pre-PR baseline):**
```bash
converge --help
converge status
converge verify
converge run --dry --max-iterations=1 --playbook=default
converge show gantt && converge show graph
converge inspect
converge plan "test prompt" --dry
```

Plus SIGINT during `converge run` → exits within 10s, no zombie children.

**Acceptance:**
- PR1 parseArgs, scope, init suites green
- `cli/main.ts` ≤300 lines; `cli/commands.ts` deleted
- Smoke matrix matches pre-PR output exactly (capture baseline before, diff after)
- `pnpm typecheck` + `pnpm test` green

- Analysis: `D:/converge/.converge/artifacts/split-cli/007-split-commands-main/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/007-split-commands-main/implement/plan.md`

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

Write `D:/converge/.converge/artifacts/split-cli/007-split-commands-main/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
