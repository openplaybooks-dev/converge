---
id: 001-execute
title: "Execute: Extract cli/args/, cli/bootstrap/, cli/dispatch/ from main.ts. Split commands.ts into per-command files. Delete commands.ts."
---

Implement the PR.

**Summary:** Extract cli/args/, cli/bootstrap/, cli/dispatch/ from main.ts. Split commands.ts into per-command files. Delete commands.ts.

**Spec:**
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

**Analysis:** `D:/converge/.converge/artifacts/split-cli/007-split-commands-main/analyze/plan.md`
