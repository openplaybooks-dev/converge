---
id: 001-behavior-tests
title: PR1 — Behavior-locking tests (safety net)
blocking: true
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js"
vars:
  taskId: 001-behavior-tests
  title: PR1 — Behavior-locking tests (safety net)
  tier: 0 — Safety net
  task: Tests against current file paths so every subsequent move/split is regression-proof. Includes a recorded-trace test of converge() to lock navigator JIT semantics.
  spec: "Write behavior-locking vitest suites under `packages/core/tests/` that run green against the *current* layout. These are the regression net for every subsequent PR.\n\n**Location:** `packages/core/tests/{cli,tree/next-task,orchestrator/autonomous,repair/navigator}/`\n\n**Suites to add:**\n\n| Target (future path)                       | Test against (current path)                       | What to lock                                                                                 |\n| ------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |\n| `cli/args/parse.ts`                        | `cli/main.ts` `parseArgs`                         | Exact option + positional shape for representative argvs                                     |\n| `cli/bootstrap/scope.ts`                   | `cli/main.ts` scope detect block                  | 1-playbook fixture → `CONVERGE_PLAYBOOK` set; 2-playbook → unset                              |\n| `scheduler/build-tree.ts`                  | `cli/next-task.ts` `buildTaskTree`                | 2-epic + WBS-parent fixture → exact tree order + `journalTaskId` per node                    |\n| `scheduler/task-states.ts`                 | `cli/next-task.ts` `getTaskStates`                | fixture with complete + running + seeded → exact membership of 5 state sets                  |\n| `scheduler/execution-plan.ts`              | `cli/next-task.ts` `calculateExecutionPlan`       | 3-epic fixture → exact `{startIndex,endIndex}` per node                                      |\n| `scheduler/find-next.ts`                   | `cli/next-task.ts` `findNextTask`                 | all-complete → null; partial → correct first-incomplete                                      |\n| `orchestrator/autonomous/recovery.ts`      | `cli/autonomous-run.ts` `detectStuckTasks`        | running-status.json + stale lease fixture → returns it                                       |\n| `orchestrator/autonomous/dirty-session.ts` | `cli/autonomous-run.ts` `formatAge`               | interrupted <5m vs >1h → exact output strings                                                 |\n| `cli/commands/init.ts`                     | `cli/commands.ts` `initCommand`                   | in-memory fs + `--yes` → exact `.converge/` structure                                        |\n| `navigator/graph-basics`                   | `repair/navigator/graph.ts`                       | `addNode` → \"buffered\" status; `getBufferedNodes` filters; `toJSON`/`fromJSON` round-trip    |\n| `navigator/graph-query`                    | `repair/navigator/graph.ts`                       | `getNodesByHandler`, `lastExecuted`, `getLastN` return correct ordering                      |\n| `navigator/predicates`                     | `repair/navigator/predicates.ts`                  | `evalPredicate` known name → bool; unknown → documented behavior; `listPredicates` full      |\n| `navigator/task-context-persistence`       | `repair/navigator/task-context.ts`                | `WalkerState` round-trip preserves graph; `TaskContext` merge correct                         |\n| `navigator/jit-injection`                  | `repair/navigator/default-graph.ts`               | `buildPreflightNodes`/`buildResponseNodes`/`buildPostActionNodes` return expected node sets  |\n| `navigator/converge-loop`                  | `repair/navigator/navigator.ts`                   | With stub action registry: selects applicable buffered node; `continue`/`done`/`bail` branch correctly; `maxActions` halts |\n| **`navigator/converge-recorded-trace`**    | `repair/navigator/navigator.ts`                   | **Scripted scenario (gap → strategy → verify → done) produces exact node + event sequence.** This is the most important lock — graph/JIT semantics are where silent regressions hide |\n\n**Design rules:**\n- Every test drives code via its **current import path**. Post-move PRs only update the import line; tests survive unchanged.\n- Fixtures: minimal fake `Unit`, fake `Gap[]`, in-memory `TaskContext`. No real LLM calls, no real disk outside `os.tmpdir()`.\n- Each suite runs in <1s.\n\n**Acceptance:**\n- `pnpm --filter @converge/core test` green with the new suites\n- Coverage shows every public export in the targeted modules exercised\n- No source files moved in this PR"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/001-behavior-tests"
  itemTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js\""
---

# PR1 — Behavior-locking tests (safety net)

**Tier:** 0 — Safety net

**Summary:** Tests against current file paths so every subsequent move/split is regression-proof. Includes a recorded-trace test of converge() to lock navigator JIT semantics.

## Full specification

Write behavior-locking vitest suites under `packages/core/tests/` that run green against the *current* layout. These are the regression net for every subsequent PR.

**Location:** `packages/core/tests/{cli,tree/next-task,orchestrator/autonomous,repair/navigator}/`

**Suites to add:**

| Target (future path)                       | Test against (current path)                       | What to lock                                                                                 |
| ------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `cli/args/parse.ts`                        | `cli/main.ts` `parseArgs`                         | Exact option + positional shape for representative argvs                                     |
| `cli/bootstrap/scope.ts`                   | `cli/main.ts` scope detect block                  | 1-playbook fixture → `CONVERGE_PLAYBOOK` set; 2-playbook → unset                              |
| `scheduler/build-tree.ts`                  | `cli/next-task.ts` `buildTaskTree`                | 2-epic + WBS-parent fixture → exact tree order + `journalTaskId` per node                    |
| `scheduler/task-states.ts`                 | `cli/next-task.ts` `getTaskStates`                | fixture with complete + running + seeded → exact membership of 5 state sets                  |
| `scheduler/execution-plan.ts`              | `cli/next-task.ts` `calculateExecutionPlan`       | 3-epic fixture → exact `{startIndex,endIndex}` per node                                      |
| `scheduler/find-next.ts`                   | `cli/next-task.ts` `findNextTask`                 | all-complete → null; partial → correct first-incomplete                                      |
| `orchestrator/autonomous/recovery.ts`      | `cli/autonomous-run.ts` `detectStuckTasks`        | running-status.json + stale lease fixture → returns it                                       |
| `orchestrator/autonomous/dirty-session.ts` | `cli/autonomous-run.ts` `formatAge`               | interrupted <5m vs >1h → exact output strings                                                 |
| `cli/commands/init.ts`                     | `cli/commands.ts` `initCommand`                   | in-memory fs + `--yes` → exact `.converge/` structure                                        |
| `navigator/graph-basics`                   | `repair/navigator/graph.ts`                       | `addNode` → "buffered" status; `getBufferedNodes` filters; `toJSON`/`fromJSON` round-trip    |
| `navigator/graph-query`                    | `repair/navigator/graph.ts`                       | `getNodesByHandler`, `lastExecuted`, `getLastN` return correct ordering                      |
| `navigator/predicates`                     | `repair/navigator/predicates.ts`                  | `evalPredicate` known name → bool; unknown → documented behavior; `listPredicates` full      |
| `navigator/task-context-persistence`       | `repair/navigator/task-context.ts`                | `WalkerState` round-trip preserves graph; `TaskContext` merge correct                         |
| `navigator/jit-injection`                  | `repair/navigator/default-graph.ts`               | `buildPreflightNodes`/`buildResponseNodes`/`buildPostActionNodes` return expected node sets  |
| `navigator/converge-loop`                  | `repair/navigator/navigator.ts`                   | With stub action registry: selects applicable buffered node; `continue`/`done`/`bail` branch correctly; `maxActions` halts |
| **`navigator/converge-recorded-trace`**    | `repair/navigator/navigator.ts`                   | **Scripted scenario (gap → strategy → verify → done) produces exact node + event sequence.** This is the most important lock — graph/JIT semantics are where silent regressions hide |

**Design rules:**
- Every test drives code via its **current import path**. Post-move PRs only update the import line; tests survive unchanged.
- Fixtures: minimal fake `Unit`, fake `Gap[]`, in-memory `TaskContext`. No real LLM calls, no real disk outside `os.tmpdir()`.
- Each suite runs in <1s.

**Acceptance:**
- `pnpm --filter @converge/core test` green with the new suites
- Coverage shows every public export in the targeted modules exercised
- No source files moved in this PR

---

Runs the full pipeline: **analyze → implement → review → quality**.
