---
id: 001-behavior-tests
title: PR1 — Behavior-locking tests
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 001-behavior-tests
  title: PR1 — Behavior-locking tests
  tier: A
  task: Add tests against current file paths as safety net before any moves.
  spec: "Write behavior-locking vitest suites under `packages/core/tests/` that run green against the *current* layout. These are the regression net for every subsequent PR.\n\n**Location:** `packages/core/tests/{cli,tree/next-task,orchestrator/autonomous}/` (mirrors existing `tests/{unit,integration,journal,repair}/` convention).\n\n**Suites to add:**\n\n| Target module (future path) | Test against (current path) | What to lock |\n| --- | --- | --- |\n| `cli/args/parse.ts` | `cli/main.ts` `parseArgs` L82–143 | `parseArgs([\"run\",\"--playbook=foo\",\"--max-iterations\",\"5\"])` → exact options + positional shape |\n| `cli/bootstrap/scope.ts` | `cli/main.ts` L244–291 | 1-playbook fixture → `CONVERGE_PLAYBOOK` env set; 2-playbook → unset |\n| `tree/next-task/build-tree.ts` | `cli/next-task.ts` L95–297 | 2-epic + WBS-parent fixture → exact tree order + `journalTaskId` per node |\n| `tree/next-task/task-states.ts` | `cli/next-task.ts` L338–1325 | complete + running + seeded fixture → exact membership of 5 state sets |\n| `tree/next-task/execution-plan.ts` | `cli/next-task.ts` L1345–1396 | 3-epic fixture → exact `{startIndex,endIndex}` per node |\n| `tree/next-task/find-next.ts` | `cli/next-task.ts` L1418–1449 | all-complete → null; partial → correct first-incomplete |\n| `orchestrator/autonomous/recovery.ts` | `cli/autonomous-run.ts` L146–505 | running-status.json + stale lease → `detectStuckTasks` returns it |\n| `orchestrator/autonomous/dirty-session.ts` | `cli/autonomous-run.ts` L506–599 | interrupted <5m vs >1h → exact `formatAge` strings |\n| `cli/commands/init.ts` | `cli/commands.ts` L95–368 | in-memory fs + `--yes` → exact `.converge/` structure created |\n\n**Acceptance:** `pnpm --filter @converge/core test` green with the new suites. Do NOT move any source yet."
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\001-behavior-tests"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR1 — Behavior-locking tests

**Tier:** A

**Summary:** Add tests against current file paths as safety net before any moves.

## Full specification

Write behavior-locking vitest suites under `packages/core/tests/` that run green against the *current* layout. These are the regression net for every subsequent PR.

**Location:** `packages/core/tests/{cli,tree/next-task,orchestrator/autonomous}/` (mirrors existing `tests/{unit,integration,journal,repair}/` convention).

**Suites to add:**

| Target module (future path) | Test against (current path) | What to lock |
| --- | --- | --- |
| `cli/args/parse.ts` | `cli/main.ts` `parseArgs` L82–143 | `parseArgs(["run","--playbook=foo","--max-iterations","5"])` → exact options + positional shape |
| `cli/bootstrap/scope.ts` | `cli/main.ts` L244–291 | 1-playbook fixture → `CONVERGE_PLAYBOOK` env set; 2-playbook → unset |
| `tree/next-task/build-tree.ts` | `cli/next-task.ts` L95–297 | 2-epic + WBS-parent fixture → exact tree order + `journalTaskId` per node |
| `tree/next-task/task-states.ts` | `cli/next-task.ts` L338–1325 | complete + running + seeded fixture → exact membership of 5 state sets |
| `tree/next-task/execution-plan.ts` | `cli/next-task.ts` L1345–1396 | 3-epic fixture → exact `{startIndex,endIndex}` per node |
| `tree/next-task/find-next.ts` | `cli/next-task.ts` L1418–1449 | all-complete → null; partial → correct first-incomplete |
| `orchestrator/autonomous/recovery.ts` | `cli/autonomous-run.ts` L146–505 | running-status.json + stale lease → `detectStuckTasks` returns it |
| `orchestrator/autonomous/dirty-session.ts` | `cli/autonomous-run.ts` L506–599 | interrupted <5m vs >1h → exact `formatAge` strings |
| `cli/commands/init.ts` | `cli/commands.ts` L95–368 | in-memory fs + `--yes` → exact `.converge/` structure created |

**Acceptance:** `pnpm --filter @converge/core test` green with the new suites. Do NOT move any source yet.

---

Runs the full pipeline: **analyze → implement → review → quality**.
