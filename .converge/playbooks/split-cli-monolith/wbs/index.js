/**
 * WBS: split-cli root
 *
 * Seeds 13 sequential PR items from templates/item.
 * Each item runs the analyze → implement → review → quality pipeline.
 *
 * PR ordering matters — every PR depends on the previous landing cleanly.
 * Sequential spawn order (within a single parent) enforces this.
 */

import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PRS = [
  {
    id: '001-behavior-tests',
    title: 'PR1 — Behavior-locking tests',
    tier: 'A',
    summary: 'Add tests against current file paths as safety net before any moves.',
    spec: `Write behavior-locking vitest suites under \`packages/core/tests/\` that run green against the *current* layout. These are the regression net for every subsequent PR.

**Location:** \`packages/core/tests/{cli,tree/next-task,orchestrator/autonomous}/\` (mirrors existing \`tests/{unit,integration,journal,repair}/\` convention).

**Suites to add:**

| Target module (future path) | Test against (current path) | What to lock |
| --- | --- | --- |
| \`cli/args/parse.ts\` | \`cli/main.ts\` \`parseArgs\` L82–143 | \`parseArgs(["run","--playbook=foo","--max-iterations","5"])\` → exact options + positional shape |
| \`cli/bootstrap/scope.ts\` | \`cli/main.ts\` L244–291 | 1-playbook fixture → \`CONVERGE_PLAYBOOK\` env set; 2-playbook → unset |
| \`tree/next-task/build-tree.ts\` | \`cli/next-task.ts\` L95–297 | 2-epic + WBS-parent fixture → exact tree order + \`journalTaskId\` per node |
| \`tree/next-task/task-states.ts\` | \`cli/next-task.ts\` L338–1325 | complete + running + seeded fixture → exact membership of 5 state sets |
| \`tree/next-task/execution-plan.ts\` | \`cli/next-task.ts\` L1345–1396 | 3-epic fixture → exact \`{startIndex,endIndex}\` per node |
| \`tree/next-task/find-next.ts\` | \`cli/next-task.ts\` L1418–1449 | all-complete → null; partial → correct first-incomplete |
| \`orchestrator/autonomous/recovery.ts\` | \`cli/autonomous-run.ts\` L146–505 | running-status.json + stale lease → \`detectStuckTasks\` returns it |
| \`orchestrator/autonomous/dirty-session.ts\` | \`cli/autonomous-run.ts\` L506–599 | interrupted <5m vs >1h → exact \`formatAge\` strings |
| \`cli/commands/init.ts\` | \`cli/commands.ts\` L95–368 | in-memory fs + \`--yes\` → exact \`.converge/\` structure created |

**Acceptance:** \`pnpm --filter @converge/core test\` green with the new suites. Do NOT move any source yet.`,
  },
  {
    id: '002-move-next-task',
    title: 'PR2 — Move cli/next-task.ts to src/tree/next-task.ts',
    tier: 'A',
    summary: 'Single-file move of cli/next-task.ts into src/tree/. No content split yet.',
    spec: `Move \`packages/core/src/cli/next-task.ts\` → \`packages/core/src/tree/next-task.ts\` with zero content changes.

**Import sites to update (10):**
- \`packages/core/src/cli/commands-*.ts\` (6 files that import next-task)
- \`packages/core/src/cli/reconcile.ts\`
- \`packages/core/src/cli/autonomous-run.ts\`
- \`packages/core/src/cli/tree-display.ts\`
- \`packages/core/src/checkpoint/ensure-epic-checkpoints.ts\` (non-CLI consumer)

Find all consumers with:
\`\`\`bash
grep -rn "from.*cli/next-task" packages/core/src
\`\`\`

**Acceptance:**
- \`pnpm --filter @converge/core build\` clean
- \`pnpm --filter @converge/core test\` green (PR1 suites still pass)
- \`git mv\` used so history is preserved`,
  },
  {
    id: '003-split-next-task',
    title: 'PR3 — Split src/tree/next-task.ts into 5 files + barrel',
    tier: 'A',
    summary: 'Decompose the 1449-line next-task.ts into focused modules under src/tree/next-task/.',
    spec: `Split \`packages/core/src/tree/next-task.ts\` into:

| New file | Lines | Source range (original cli/next-task.ts) |
| --- | --- | --- |
| \`types.ts\` | ~80 | \`TaskNode\`, \`WbsProgress\`, \`TaskStates\`, \`ExecutionSpan\`, \`NextTaskResult\` |
| \`build-tree.ts\` | ~450 | \`treeNodesToTaskNodes\` + \`buildTaskTree\` (L95–297) |
| \`task-states.ts\` | ~700 | \`getCompletedTaskIds\` + \`getTaskStates\` (L338–1325) |
| \`execution-plan.ts\` | ~80 | \`calculateExecutionPlan\` (L1345–1396) |
| \`find-next.ts\` | ~50 | \`findNextTask\` (L1418–1449) |
| \`index.ts\` | barrel | re-export public API |

**Rules:**
- No behavior change. Pure file partitioning.
- Each file must import what it needs from siblings; no circular imports.
- Public API (what \`findNextTask\`, \`buildTaskTree\`, \`getTaskStates\` callers import) goes through \`index.ts\`.
- Update the 10 consumer imports from PR2 to use the barrel (\`../tree/next-task\` stays the same path).

**Acceptance:**
- Every split file ≤500 lines
- \`pnpm typecheck\` + \`pnpm test\` green
- PR1 behavior-locking suites still pass (they were written against symbols, not line numbers — verify they resolve via the barrel)`,
  },
  {
    id: '004-move-autonomous-run',
    title: 'PR4 — Move cli/autonomous-run.ts to src/orchestrator/autonomous.ts',
    tier: 'A',
    summary: 'Single-file move. Hard-break on root src/index.ts public export path.',
    spec: `Move \`packages/core/src/cli/autonomous-run.ts\` → \`packages/core/src/orchestrator/autonomous.ts\`. No content split.

**Import sites to update (4):**
- \`packages/core/src/cli/commands-run.ts\`
- \`packages/core/src/converge/converge-runner.ts\`
- \`packages/core/src/evolve/evolve-runner.ts\`
- \`packages/core/src/index.ts\` ← **public export path changes — no shim, hard break**

**Post-move (this PR):** add an ESLint rule \`no-restricted-imports\` banning \`../cli/*\` from \`tree/\`, \`orchestrator/\`, \`checkpoint/\`, \`journal/\` to prevent future regressions.

**Acceptance:**
- \`pnpm typecheck\` + \`pnpm test\` green
- swebench + tbench (which depend on @converge/core) re-run green — proves public surface is intact at the new path
- Downstream of \`@converge/core\` that used \`import { autonomousRun } from '@converge/core'\` still works (root index re-export path updated, symbol name unchanged)`,
  },
  {
    id: '005-split-autonomous',
    title: 'PR5 — Split src/orchestrator/autonomous.ts into 5 files + barrel',
    tier: 'A',
    summary: 'Decompose the 1180-line autonomous-run.ts into focused modules.',
    spec: `Split \`packages/core/src/orchestrator/autonomous.ts\` into:

| New file | Lines | Source range |
| --- | --- | --- |
| \`types.ts\` | ~80 | \`AutonomousRunConfig\`, \`AutonomousRunResult\`, \`TreeSnap\` |
| \`snap.ts\` | ~50 | \`snapTree\` (L111–145) |
| \`recovery.ts\` | ~500 | \`detectStuckTasks\`, \`recoverStuckTasks\`, \`resetAllTasks\`, \`recoverFailedTasks\`, \`collectCheckpointsRecursive\` (L146–505) |
| \`dirty-session.ts\` | ~120 | \`DIRTY_SESSION_STATUSES\`, \`formatAge\`, \`getLastSessionMetadata\`, \`guardDirtySession\` (L506–599) |
| \`run-loop.ts\` | ~350 | \`autonomousRun\` main body (L600–1180) |
| \`index.ts\` | barrel | re-export public API |

**Rules:**
- No behavior change.
- \`run-loop.ts\` imports from siblings; no circular imports.
- Public path \`@converge/core → orchestrator/autonomous\` continues to export the same symbols.

**Acceptance:**
- Every file ≤500 lines
- PR1 recovery + dirty-session suites green
- \`pnpm typecheck\` + \`pnpm test\` green`,
  },
  {
    id: '006-split-commands',
    title: 'PR6 — Split cli/commands.ts',
    tier: 'A',
    summary: 'Break the 1268-line commands.ts into per-command modules.',
    spec: `Split \`packages/core/src/cli/commands.ts\` into:

| New file | Contents |
| --- | --- |
| \`cli/commands/init.ts\` (~370L) | \`initCommand\` (L95–368) |
| \`cli/commands/plugins.ts\` (~20L) | \`pluginsCommand\` |
| \`cli/commands/checkpoint.ts\` (~260L) | \`checkpointCommand\` (L749–1006) |
| \`cli/commands/legacy-run-status.ts\` (~300L) | \`runCommand\`, \`resumeCommand\`, \`statusCommand\`, \`addGoal\`, \`removeGoal\`, \`resetCommand\` (V2 wrappers kept together) |

**Rules:**
- Delete \`cli/commands.ts\` entirely. No re-export shim.
- Update \`cli/main.ts\` imports to the new paths.
- If legacy wrappers are verifiably unused, delete them in this PR (do not leave for later).

**Acceptance:**
- \`cli/commands.ts\` no longer exists
- PR1 init suite green
- \`pnpm typecheck\` + \`pnpm test\` green
- Smoke: \`converge init --yes\` in a temp dir, \`converge plugins\`, \`converge checkpoint --help\``,
  },
  {
    id: '007-move-display',
    title: 'PR7 — Move display modules into cli/display/',
    tier: 'A',
    summary: 'Group tree-display, inspect-display, progress-logger + show renderers into cli/display/.',
    spec: `Move:
- \`cli/tree-display.ts\` → \`cli/display/tree-display.ts\`
- \`cli/inspect-display.ts\` → \`cli/display/inspect-display.ts\`
- \`cli/progress-logger.ts\` → \`cli/display/progress-logger.ts\`
- Also relocate the show/ renderers (\`gantt.ts\`, \`graph.ts\`) into \`cli/display/show/\` if they're self-contained.

**Import sites to update (≥5):** any file importing the moved modules. Find with:
\`\`\`bash
grep -rn "from.*cli/\\(tree\\|inspect\\|progress\\)-" packages/core/src
\`\`\`

**Acceptance:**
- \`pnpm typecheck\` + \`pnpm test\` green
- Smoke: \`converge show gantt\`, \`converge show graph\`, \`converge inspect\` produce same output as before (capture baseline pre-move, diff post-move)`,
  },
  {
    id: '008-extract-args-bootstrap',
    title: 'PR8 — Extract cli/args/ and cli/bootstrap/ from main.ts',
    tier: 'A',
    summary: 'Pure cut-and-paste from main.ts. No logic changes.',
    spec: `Extract from \`cli/main.ts\` (1280L) into dedicated modules:

| New file | Lines | Source range (main.ts) |
| --- | --- | --- |
| \`cli/args/parse.ts\` | ~120 | \`parseArgs\` L82–143 |
| \`cli/args/redirects.ts\` | ~40 | \`REDIRECTS\` map + handler L305–321 |
| \`cli/bootstrap/shutdown.ts\` | ~60 | \`shutdownController\` singleton + \`setupGracefulShutdown\` L190–229 |
| \`cli/bootstrap/scope.ts\` | ~90 | 3-strategy playbook auto-detect L244–291 |
| \`cli/bootstrap/entry.ts\` | ~30 | Windows \`_isMain\` guard L1274–1278 |

**Critical invariants — do NOT alter:**
- \`shutdownController\` must be exported as a *named const* singleton, never re-created per call
- \`scope.ts\` 3-strategy detection order is order-sensitive — preserve exactly; sets \`CONVERGE_PLAYBOOK\` env var
- \`entry.ts\` keeps \`realpathSync\` + \`pathToFileURL\` fallback verbatim
- \`process.env.PYTHONIOENCODING\` line (main.ts L14–15) stays at top of \`main.ts\` — do not move

**Acceptance:**
- PR1 parse + scope suites green
- Smoke matrix (every subcommand with \`--help\`) shows unchanged output
- SIGINT during \`converge run\` still exits within 10s (shutdown handler intact)`,
  },
  {
    id: '009-extract-dispatch',
    title: 'PR9 — Extract cli/dispatch/* from main.ts switch',
    tier: 'A',
    summary: 'Highest-risk PR. Each case in the main switch becomes a module call.',
    spec: `Extract dispatch handlers from \`cli/main.ts\` switch into \`cli/dispatch/\`:

| New file | Lines | Source range |
| --- | --- | --- |
| \`cli/dispatch/run.ts\` | ~250 | "run" case incl. \`--playbook\` wrapper L325–592 |
| \`cli/dispatch/plan.ts\` | ~180 | "plan" case + \`buildPlanTaskMd\` L766–925 + L1219–1262 |
| \`cli/dispatch/show.ts\` | ~60 | "show" case |
| \`cli/dispatch/skills.ts\` | ~30 | "skills" case |
| \`cli/dispatch/playbook.ts\` | ~40 | "playbook" case |
| \`cli/dispatch/simple.ts\` | ~150 | remaining subcommand routers |

After this PR, \`cli/main.ts\` should be ~250 lines — only imports, top-level try/catch, dispatch switch calling into modules.

**Run full smoke matrix:**
\`\`\`bash
converge --help
converge status
converge verify
converge run --dry --max-iterations=1 --playbook=default
converge show gantt && converge show graph
converge inspect
converge plan "test prompt" --dry
\`\`\`
Plus SIGINT test during \`converge run\` — must exit within 10s, no zombie children.

**Acceptance:**
- All smoke checks pass with identical output to pre-PR baseline
- \`cli/main.ts\` ≤300 lines
- \`pnpm typecheck\` + \`pnpm test\` green`,
  },
  {
    id: '010-extract-display-pkg',
    title: 'PR10 — Extract @converge/display workspace package',
    tier: 'B',
    summary: 'Move cli/display/* into its own package. Terminal-only renderer — never imported by core.',
    spec: `Create \`packages/display/\` workspace package — a **terminal/ANSI renderer**, not a general formatting lib.

**Source:** \`packages/core/src/cli/display/*\` (location from PR7)

**Package shape:**
- \`packages/display/package.json\` — name \`@converge/display\`, deps: none (pure formatting with ANSI)
- \`packages/display/tsconfig.json\`, \`tsup.config.ts\`, \`vitest.config.ts\`
- \`packages/display/src/index.ts\` — exports \`printTaskTree\`, \`formatInspectSession\`, \`ProgressLogger\`, color/box helpers

**Layering invariant — HARD RULE:**
\`@converge/display\` is consumed **only** by \`@converge/cli\`.
It must NOT appear in:
- \`packages/core/package.json\` dependencies
- any \`import\` in \`packages/core/src/**\`
- any \`import\` in \`packages/scheduler/src/**\` or \`packages/journal/src/**\` (once those exist)

A future web UI will supply its own renderer against \`@converge/core\`. This split is what makes that possible.

**Audit of current import sites:** anything in \`packages/core/src/cli/\` that imports \`./display/*\` is fine to keep — those files become part of \`@converge/cli\` in PR13. But if any \`display/*\` import exists in \`packages/core/src/\` **outside** the \`cli/\` subtree (e.g. from \`orchestrator/\`, \`tree/\`, \`checkpoint/\`), that's the bug — refactor it out **before** extracting the package:

\`\`\`bash
# Must return nothing. Any hit is a layering violation that PR10 must fix, not inherit.
grep -rn "from.*cli/display\\|from.*['\\\"]\\.\\./display" packages/core/src \\
  | grep -v "packages/core/src/cli/"
\`\`\`

**Core side:**
- Remove \`packages/core/src/cli/display/\` from core's \`files\` + tsup entry
- \`packages/core/package.json\` adds \`"@converge/display": "workspace:*"\` — but only if core's \`cli/\` still lives in core (pre-PR13). Remove it again in PR13.
- Update all import sites in \`packages/core/src/cli/\`: \`./display/X\` → \`@converge/display\`

**Acceptance:**
- \`pnpm -r build\` + \`pnpm -r test\` green
- \`pnpm install\` from clean state — no phantom deps
- \`@converge/display\` tests run in isolation (proves containment)
- **Layering audit**: \`grep -rn "@converge/display" packages/core/src\` returns only matches inside \`packages/core/src/cli/\`. Zero matches in \`orchestrator/\`, \`tree/\`, \`checkpoint/\`, \`journal/\`, or at the root of \`src/\`.`,
  },
  {
    id: '011-extract-journal-pkg',
    title: 'PR11 — Extract @converge/journal workspace package',
    tier: 'B',
    summary: 'Move journal, checkpoint, storage into their own package. High import churn (~40 sites).',
    spec: `Create \`packages/journal/\` workspace package.

**Source:** \`packages/core/src/{journal,checkpoint,storage}/*\`

**Deps:** \`zod\` only.

**Exports:**
- \`CheckpointManager\`, \`TaskCheckpointManager\`, \`UnitCheckpointManager\`
- \`SessionLogger\`
- \`FilesystemStorage\`
- \`constructJournalPath\`
- \`JournalCleanup\`

**Caveat — ensure-epic-checkpoints.ts:**
\`packages/core/src/checkpoint/ensure-epic-checkpoints.ts\` imports \`TaskNode\` which (post-PR3) lives in \`tree/next-task/\`. This creates a cycle if we naively move it into journal.

**Resolution:** move \`ensure-epic-checkpoints.ts\` into \`@converge/scheduler\` (PR12), not \`@converge/journal\`. It's a scheduler concern, not a journal concern.

**High-churn:** ~40 import sites in core will change. Use a codemod or careful grep-driven edit.

**Acceptance:**
- \`pnpm -r build\` + \`pnpm -r test\` green
- swebench + tbench tests re-run green
- \`@converge/journal\` tests pass in isolation`,
  },
  {
    id: '012-extract-scheduler-pkg',
    title: 'PR12 — Extract @converge/scheduler workspace package',
    tier: 'B',
    summary: 'Move tree/next-task/* + ensure-epic-checkpoints into a scheduler package.',
    spec: `Create \`packages/scheduler/\` workspace package.

**Source:**
- \`packages/core/src/tree/next-task/*\` (post-PR3 location)
- \`packages/core/src/checkpoint/ensure-epic-checkpoints.ts\` (moved here per PR11 resolution)
- subset of \`packages/core/src/tree/\` that \`next-task\` depends on

**Deps:** \`@converge/journal\` (workspace:*)

**Exports:**
- \`findNextTask\`, \`buildTaskTree\`, \`getTaskStates\`, \`calculateExecutionPlan\`
- All types (\`TaskNode\`, \`WbsProgress\`, \`TaskStates\`, \`ExecutionSpan\`, \`NextTaskResult\`)
- \`ensureEpicCheckpoints\`

**Core side:** imports \`@converge/scheduler\` wherever \`tree/next-task\` was used.

**Acceptance:**
- \`pnpm -r build\` + \`pnpm -r test\` green
- PR1 behavior-locking suites still pass (imports re-resolve to \`@converge/scheduler\`)
- Scheduler tests pass in isolation`,
  },
  {
    id: '013-extract-cli-pkg',
    title: 'PR13 — Extract @converge/cli workspace package',
    tier: 'B',
    summary: 'Move cli/* into its own package. Core becomes a pure programmatic library — web-UI-ready.',
    spec: `Create \`packages/cli/\` workspace package. \`@converge/core\` becomes a **pure programmatic library** — no CLI leakage, no stdout writes, no \`process.exit\`. A future web UI imports core directly and supplies its own I/O.

**Source:** \`packages/core/src/cli/*\`

**Deps:**
- \`@converge/core\` (workspace:*) — programmatic interface
- \`@converge/display\` (workspace:*) — terminal renderer
- \`@converge/scheduler\` (workspace:*)
- \`@converge/journal\` (workspace:*)

**Package shape:**
- \`packages/cli/package.json\` with \`"bin": { "converge": "./dist/main.js" }\`
- \`packages/cli/tsconfig.json\`, \`tsup.config.ts\`, \`vitest.config.ts\`

**Core side hard breaks (per user decision — no shims):**
- \`packages/core/package.json\` **removes** the \`bin\` entry and **removes** \`"@converge/display"\` from dependencies (display is CLI-only)
- \`packages/core/tsup.config.ts\` **removes** the CLI entry
- \`packages/core/src/cli/\` directory **deleted**
- \`packages/core/src/index.ts\` **stops** re-exporting \`autonomousRun\`; programmatic consumers import from \`@converge/core/orchestrator/autonomous\` directly

**Programmatic API surface of \`@converge/core\` (post-PR13):**

Whatever a web UI or an embedder would reasonably need must be reachable without importing \`@converge/cli\`. Enumerate and verify:

| Capability              | Programmatic entry                                          |
| ----------------------- | ----------------------------------------------------------- |
| Run a playbook          | \`autonomousRun(config): Promise<AutonomousRunResult>\`     |
| Load a playbook         | playbook loader exports                                     |
| Query task tree state   | via \`@converge/scheduler\` (\`findNextTask\`, \`getTaskStates\`) |
| Read/write checkpoints  | via \`@converge/journal\` (\`CheckpointManager\` et al.)    |
| Resume/recover a run    | \`detectStuckTasks\`, \`recoverStuckTasks\`, \`resetAllTasks\` |
| Session logging         | \`SessionLogger\` from \`@converge/journal\`                |

Each of these must accept I/O-agnostic inputs (config objects, paths, callbacks) and return data structures. No \`console.log\`, no \`process.stdout.write\`, no \`process.exit\`, no \`readline\` inside \`@converge/core\`.

**Layering audit — MUST PASS as checks:**

\`\`\`bash
# 1. No process.exit in core (only cli may exit the process)
grep -rn "process\\.exit" packages/core/src && exit 1 || true

# 2. No stdout/stderr writes from core
grep -rn "process\\.stdout\\.write\\|process\\.stderr\\.write" packages/core/src && exit 1 || true

# 3. No console.log / console.error in core (warnings via throw or structured logger callbacks only)
grep -rn "console\\.\\(log\\|error\\|warn\\|info\\)" packages/core/src | grep -v ".test.ts" && exit 1 || true

# 4. No ANSI escape literals in core
grep -rn "\\\\u001b\\[\\|\\\\x1b\\[" packages/core/src && exit 1 || true

# 5. Core does NOT depend on display or cli
grep -n "@converge/display\\|@converge/cli" packages/core/package.json && exit 1 || true
\`\`\`

If any of the above fires, the offending code is CLI-flavored behavior that should live in \`@converge/cli\`. Fix the violation (move the behavior, inject a callback, or return data) — don't add a suppression.

**Downstream verification:**
- swebench + tbench still depend on \`@converge/core\` only — re-run their tests. If either starts needing \`@converge/cli\`, the API surface is wrong.
- \`npx converge --help\` from \`@converge/cli\` dist runs the bin
- **Smoke test programmatic usage:** write a ~30-line standalone Node script that \`import\`s \`@converge/core\` and runs \`autonomousRun\` against a fixture playbook with zero \`@converge/cli\` imports. Keep it in \`packages/core/tests/smoke/programmatic.test.ts\`. This is the web UI's integration pattern — if the script works, the web UI will too.

**Acceptance:**
- All 5 layering audits above return clean
- Programmatic smoke test passes
- \`pnpm -r build\` + \`pnpm -r test\` green across all packages
- \`pnpm install\` from clean state — no phantom deps
- Full smoke matrix on \`converge\` bin (every subcommand)
- SIGINT test still green`,
  },
  {
    id: '014-navigator-lock-tests',
    title: 'PR14 — Behavior-locking tests for repair/navigator',
    tier: 'C',
    summary: 'Safety net for the navigator extraction — lock current converge() / NavigatorGraph / predicate / JIT-injection behavior before any moves.',
    spec: `Add vitest suites under \`packages/core/tests/repair/navigator/\` that run green against the current \`packages/core/src/repair/navigator/*\` layout. These are the regression net for PR15 and PR16.

**Scope of what exists today** (ground-truth audit — counts may shift before the PR runs, re-grep):

| File | LOC | Public shape |
| --- | --- | --- |
| \`navigator.ts\` | ~476 | \`converge(opts): Promise<ConvergeResult>\` — main per-iteration loop |
| \`actions.ts\` | ~1236 | \`buildActionRegistry(): Map<string, ActionHandler>\` — 20 domain-specific handlers (repair-loop, run-strategy, detect-gaps, verify, signal-done, check-wbs-seeded, check-outputs-exist, advance-attempt, check-stall, start-new-cycle, …) |
| \`graph.ts\` | ~127 | \`class NavigatorGraph implements Graph\` with \`addNode\`, \`getNode\`, \`getBufferedNodes\`, \`getNodesByHandler\`, \`lastExecuted\`, \`getLastN\`, \`toJSON\`, \`fromJSON\` |
| \`types.ts\` | ~130 | \`Snapshot\`, \`GraphNode\`, \`GraphEdge\`, \`Graph\`, \`WalkResult\`, \`ActionHandler\`, \`GoalCondition\` |
| \`default-graph.ts\` | ~173 | \`buildPreflightNodes\`, \`buildResponseNodes\`, \`buildPostActionNodes\` — JIT node builders (repair-specific) |
| \`task-context.ts\` | ~180 | \`TaskContext\`, \`WalkerState\` — JSON-serializable persistence |
| \`predicates.ts\` | ~113 | \`evalPredicate(name, snap)\`, \`listPredicates()\`, predicate registry |

**Single entry point in consumers:** \`Unit.run()\` in \`packages/core/src/unit/run.ts\` is the only external caller of \`converge()\`. No CLI code imports the navigator directly.

**Suites to add** (test behavior, not line numbers):

| Target area | Test | What to lock |
| --- | --- | --- |
| \`graph.ts\` | graph-basics.test.ts | addNode → status "buffered" by default; getBufferedNodes returns buffered only; toJSON/fromJSON round-trip preserves nodes, edges, statuses |
| \`graph.ts\` | graph-query.test.ts | getNodesByHandler filters by handler name; lastExecuted returns most-recent "done" node; getLastN returns N most-recent in order |
| \`predicates.ts\` | predicates.test.ts | evalPredicate with registered name returns bool; unknown predicate → default (document current behavior: throw or false); listPredicates returns full registry |
| \`task-context.ts\` | task-context-persistence.test.ts | WalkerState round-trip (serialize + parse) preserves graph state; TaskContext merges with new snapshot correctly |
| \`default-graph.ts\` | jit-injection.test.ts | buildPreflightNodes returns the 4 seed nodes; buildResponseNodes(unit, gaps) returns one handler node per gap-type match; buildPostActionNodes returns verify + check-stall + advance-attempt |
| \`navigator.ts\` | converge-loop.test.ts | With stub action registry: loop selects first applicable buffered node; handler's WalkResult.action="continue" injects response nodes; action="done" exits; action="bail" exits; maxActions halts the loop |
| \`navigator.ts\` | converge-events.test.ts | Each iteration emits a structured event (capture via injected/current event writer); event sequence matches exact expected order for a scripted scenario |
| \`actions.ts\` | action-registry-shape.test.ts | buildActionRegistry() returns Map with exact set of 20 expected handler names; each handler is a function of arity 2 |

**Design rule:** every test must drive \`converge()\` or \`NavigatorGraph\` via their **current import paths** (\`../../src/repair/navigator/...\`). PR16 updates those paths to \`@converge/navigator\`; if the suites break on only the import line change, the extraction succeeded behaviorally.

**Fixtures:** a minimal fake \`Unit\` + fake \`Gap[]\` + in-memory \`TaskContext\`. Do not stand up real executors or real strategies — those are integration concerns covered elsewhere.

**Acceptance:**
- \`pnpm --filter @converge/core test tests/repair/navigator\` green
- Each suite runs in <1s (no real LLM calls, no real disk I/O outside temp)
- Coverage report shows every public export in \`graph.ts\`, \`predicates.ts\`, \`task-context.ts\`, \`default-graph.ts\`, and the main loop branches of \`navigator.ts\` exercised`,
  },
  {
    id: '015-split-navigator-from-actions',
    title: 'PR15 — Split navigator engine from repair actions',
    tier: 'C',
    summary: 'Within core: separate the domain-agnostic engine (graph, loop, predicates) from the repair-specific 20-handler registry. Prepares the clean extraction boundary.',
    spec: `The navigator directory currently mixes two layers:

- **Engine (domain-agnostic):** \`graph.ts\`, \`types.ts\`, \`navigator.ts\`, \`predicates.ts\`, \`task-context.ts\` — the reactive JIT-buffered node engine. Candidate for \`@converge/navigator\` in PR16.
- **Repair actions (domain-specific):** \`actions.ts\` (1236L, 20 handlers), \`default-graph.ts\` (JIT node builders wired to repair's gap/unit types) — these stay in core because they import executors, strategy catalog, gap detection, skills.

This PR splits those layers *inside core* so PR16 can move the engine cleanly.

**New layout inside \`packages/core/src/repair/\`:**

\`\`\`
repair/
  navigator/              # engine (stays until PR16 moves it out)
    graph.ts
    types.ts
    navigator.ts
    predicates.ts
    task-context.ts
    index.ts              # barrel for engine-only exports
  actions/                # NEW — repair-specific handlers, split from actions.ts
    index.ts              # buildRepairActionRegistry(): Map<string, ActionHandler>
    detect-gaps.ts
    repair-loop.ts
    run-strategy.ts
    verify.ts
    signal-done.ts
    check-wbs-seeded.ts
    check-outputs-exist.ts
    advance-attempt.ts
    check-stall.ts
    start-new-cycle.ts
    ...                   # one file per handler; group related helpers
  default-graph.ts        # stays — repair's node-builder strategy (preflight/response/post-action)
\`\`\`

**Rules:**
- The \`navigator/\` engine files must not import anything from \`repair/actions/\` or \`repair/default-graph.ts\`. Invert: the engine exposes extension points (\`ActionHandler\`, \`Graph\`, node builder callbacks); repair plugs in.
- \`actions/index.ts\` exports \`buildRepairActionRegistry()\` — same public name/shape \`Unit.run()\` used before.
- \`actions/*.ts\` individual files: one handler per file, each ≤200 lines. If a handler exceeds 200 lines, factor helpers into sibling \`_helpers.ts\` files inside \`actions/\`.
- Handlers keep their current lazy/dynamic imports of executors and strategy catalog — those stay in core.
- Event writer coupling: if \`navigator.ts\` currently imports \`../../journal/event-writer.ts\` directly, **invert it** — navigator emits events via an injected \`EventSink\` interface defined in \`navigator/types.ts\`; \`Unit.run()\` passes a journal-backed sink. This is the last coupling that would otherwise block PR16.

**Import-site updates:**
- \`packages/core/src/unit/run.ts\` — update navigator imports to \`../repair/navigator\` (barrel) and action registry import to \`../repair/actions\`. Wire the event sink.
- \`packages/core/src/config/task-definition.ts\` — type-only reference to \`converge()\`; update import path if needed.

**Grep audits (post-split):**
\`\`\`bash
# Engine must not import repair-specific layers
grep -rn "from.*['\\\"]\\.\\./\\(actions\\|default-graph\\)" packages/core/src/repair/navigator && exit 1 || true

# Engine must not import journal directly (use injected EventSink)
grep -rn "from.*journal/event-writer" packages/core/src/repair/navigator && exit 1 || true

# Actions must still register exactly the historical handler names
node -e "import('./packages/core/dist/repair/actions/index.js').then(m=>{const reg=m.buildRepairActionRegistry();const expected=['repair-loop','run-strategy','detect-gaps','verify','signal-done','check-wbs-seeded','check-outputs-exist','advance-attempt','check-stall','start-new-cycle'];for(const n of expected){if(!reg.has(n))throw new Error('missing handler: '+n)}console.log('OK',reg.size,'handlers')})"
\`\`\`

(Adjust the handler-name list during PR14 analysis against the real \`buildActionRegistry\` output — use the PR14 \`action-registry-shape.test.ts\` result as ground truth.)

**Acceptance:**
- PR14 suites still green
- No engine file imports from \`repair/actions/\` or \`repair/default-graph.ts\` or \`journal/event-writer.ts\`
- Each file in \`actions/\` ≤200 lines; engine files ≤500 lines
- \`Unit.run()\` still works end-to-end (run a scenario fixture with a trivial gap → strategy → resolved, verify via integration test)
- \`pnpm typecheck\` + \`pnpm test\` green`,
  },
  {
    id: '016-extract-navigator-pkg',
    title: 'PR16 — Extract @converge/navigator workspace package',
    tier: 'C',
    summary: 'AI-driven reactive navigator as a standalone package. Drives plugged-in handlers/scenarios through a JIT-buffered node graph. Zero deps.',
    spec: `Create \`packages/navigator/\` workspace package — the reactive engine that PR15 isolated. Core plugs its 20 repair handlers into this engine; a future agent-authoring UI can plug in its own handlers.

## Concept

\`@converge/navigator\` is the **driver** for AI-influenced reactive flows:

- **Graph of nodes.** Each node is a handler reference — work to be executed when the node becomes applicable.
- **Just-in-time buffered.** The full graph is never pre-seeded. Handlers return \`WalkResult\`s that buffer new nodes in response to state (gaps detected, post-action triggers, stall events). The graph grows lazily as the scenario unfolds.
- **Reactive.** Each iteration the engine picks the next buffered node whose predicate is currently applicable against the live snapshot. State transitions are driven by what handlers observe and enqueue, not a pre-wired state machine.
- **AI enters through handlers.** The engine is deterministic; the *handlers* it dispatches can be AI-driven (call an LLM, pick a strategy, invoke a skill). The AI shapes the traversal by choosing what to buffer next, not by being baked into the engine.

This matches the current repair loop: gaps → repair-loop handler (calls AI-ranked strategy selection) → run-strategy handler → verify → either done or new gaps → repeat.

## Source (from PR15 layout)

- \`packages/core/src/repair/navigator/graph.ts\` → \`packages/navigator/src/graph.ts\`
- \`packages/core/src/repair/navigator/types.ts\` → \`packages/navigator/src/types.ts\`
- \`packages/core/src/repair/navigator/navigator.ts\` → \`packages/navigator/src/navigator.ts\`
- \`packages/core/src/repair/navigator/predicates.ts\` → \`packages/navigator/src/predicates.ts\`
- \`packages/core/src/repair/navigator/task-context.ts\` → \`packages/navigator/src/task-context.ts\`
- \`packages/core/src/repair/navigator/index.ts\` → \`packages/navigator/src/index.ts\`
- PR14 tests move to \`packages/navigator/tests/\`

## Package shape

\`\`\`
packages/navigator/
  package.json           # name: @converge/navigator, deps: {} (zero)
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  src/
    index.ts             # barrel
    graph.ts
    types.ts
    navigator.ts
    predicates.ts
    task-context.ts
  tests/
    graph-basics.test.ts
    graph-query.test.ts
    predicates.test.ts
    task-context-persistence.test.ts
    jit-injection.test.ts    # NOTE: this one tests a repair-specific file — stays in core, see below
    converge-loop.test.ts
    converge-events.test.ts
\`\`\`

## Exports

\`\`\`ts
// Engine entry
export { converge } from './navigator';
export type { ConvergeOptions, ConvergeResult } from './navigator';

// Graph
export { NavigatorGraph } from './graph';
export type { Graph, GraphNode, GraphEdge, NodeStatus } from './types';

// Handler contract
export type { ActionHandler, WalkResult, WalkAction, Snapshot, GoalCondition } from './types';

// Predicate registry (extensible)
export { evalPredicate, registerPredicate, listPredicates } from './predicates';

// Persistence
export { TaskContext } from './task-context';
export type { WalkerState } from './task-context';

// Event contract (injected, not provided)
export type { EventSink, NavigatorEvent } from './types';
\`\`\`

## Dependencies

**Target: zero runtime deps.** The engine is pure TypeScript — no journal, no filesystem, no logging framework. Everything domain-specific is plugged in by the consumer:

- **Handlers:** consumer passes \`Map<string, ActionHandler>\` via \`ConvergeOptions.actions\`.
- **Node builders (JIT injection strategies):** consumer passes preflight/response/post-action builder callbacks via \`ConvergeOptions.nodeBuilders\`. (Currently repair's \`default-graph.ts\` — stays in core as a repair strategy.)
- **Event logging:** consumer passes an \`EventSink\` (PR15 introduced this); journal backing lives in core.
- **Predicate registry:** ships with a minimal built-in set; consumers call \`registerPredicate(name, fn)\` to extend.

If anything in \`packages/navigator/src/\` imports filesystem APIs, path APIs, or any \`@converge/*\` package, that's a layering violation — refactor to an injected callback.

## Core side

- \`packages/core/package.json\` adds \`"@converge/navigator": "workspace:*"\`
- \`packages/core/src/repair/navigator/\` directory **deleted**
- \`packages/core/src/repair/default-graph.ts\` **stays** (repair's node-builder strategy — plugged into \`converge()\` by \`Unit.run()\`)
- \`packages/core/src/repair/actions/\` **stays** (repair's handler registry — plugged into \`converge()\` by \`Unit.run()\`)
- \`packages/core/src/unit/run.ts\` updates imports:
  \`\`\`ts
  import { converge } from '@converge/navigator';
  import { buildRepairActionRegistry } from '../repair/actions';
  import { buildPreflightNodes, buildResponseNodes, buildPostActionNodes } from '../repair/default-graph';
  import { journalEventSink } from '../journal/navigator-sink';  // thin adapter
  \`\`\`

## Layering invariants (hard REJECT on violation)

1. **Zero deps:** \`packages/navigator/package.json\` \`dependencies\` is empty or absent.
2. **No @converge/* imports in engine:**
   \`\`\`bash
   grep -rn "@converge/" packages/navigator/src && exit 1 || true
   \`\`\`
3. **No filesystem/IO primitives:**
   \`\`\`bash
   grep -rn "from ['\\\"]\\(fs\\|fs/promises\\|path\\|os\\|process\\)['\\\"]" packages/navigator/src && exit 1 || true
   \`\`\`
   (\`process\` allowed only if used for \`process.hrtime\` or \`process.env\` — but prefer none.)
4. **No CLI/display leakage** (same rule as elsewhere):
   \`\`\`bash
   grep -rn "@converge/display\\|@converge/cli\\|console\\.\\(log\\|error\\)\\|process\\.exit" packages/navigator/src | grep -v ".test.ts" && exit 1 || true
   \`\`\`
5. **EventSink is an interface, not a concrete logger:** \`grep -n "class.*EventSink\\|new.*EventSink" packages/navigator/src\` → zero hits.

## Downstream verification

- \`Unit.run()\` still drives a repair scenario end-to-end (integration test)
- swebench + tbench still pass (they use \`Unit.run()\` through \`@converge/core\`)
- Navigator package tests pass in isolation (\`pnpm --filter @converge/navigator test\`) with zero dependencies installed — proves containment

## Acceptance

- All 5 layering audits pass
- \`pnpm -r build\` + \`pnpm -r test\` green across all packages
- \`packages/navigator/\` has zero runtime deps
- PR14 behavior-locking suites pass unchanged (only import paths updated to \`@converge/navigator\`)
- Repair integration test (fixture gap → strategy → resolved) passes end-to-end

## Out of scope (future PRs, explicitly not this one)

- Making \`Snapshot\` fully generic (\`Snapshot<TState, TTrigger>\`). Current shape keeps \`unit\` and \`gaps\` fields typed as \`unknown\` or via structural interfaces; full genericization is a follow-up that lets web/UI consumers define their own state + trigger types.
- Alternative graph backends (SQLite-backed, distributed). Keep in-memory + JSON persistence only.
- Built-in LLM-calling handlers. The engine stays AI-agnostic; handlers decide whether/how to call AI.`,
  },
];

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  const templatePath = relative(
    projectDir,
    join(__dirname, 'templates', 'item', 'TASK.md'),
  );

  for (const pr of PRS) {
    const artifactsDir = join(
      projectDir,
      '.converge',
      'artifacts',
      'split-cli',
      pr.id,
    );

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: templatePath,
        vars: {
          taskId: pr.id,
          title: pr.title,
          tier: pr.tier,
          task: pr.summary,
          spec: pr.spec,
          projectDir,
          artifactsDir,
        },
      },
      { id: pr.id },
    );
  }
}
