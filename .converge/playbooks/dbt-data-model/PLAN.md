# PLAN — dbt-data-model

## Goal

Update converge's internal data model to align with dbt's architecture. Clean break — no legacy, no backward compat, no shims.

1. **Single JSON for DAG state** — `run_results.json` replaces all per-task `checkpoint.json` files, `FilesystemTaskStatus` scanning, and the global `.checkpoint.json`.
2. **Executions replace sessions** — `session-types.ts` and `session-logger.ts` are deleted; `execution-types.ts` and `execution-logger.ts` replace them. No re-exports, no deprecation wrappers.
3. **Flat task folders** — all tasks at `tasks/{taskId}/`; hierarchy in `manifest.json` + per-task `context.json`.
4. **No cross-execution persistent state** — each execution starts fresh.
5. **Delete checkpoint infrastructure** — `CheckpointManager`, `FilesystemTaskStatus`, `UnitCheckpointManager`, `TaskCheckpointManager`.

## Chain

```
extend-types → run-results-manager → integrate-runners → migrate-cli → delete-checkpoint
```

## Flat vs Nested (design rationale)

The original model nests task folders to mirror DAG hierarchy, giving AI agents context "for free":

```
tasks/01-survey/tasks/01a-catalog/checkpoint.json   ← hierarchy in filesystem
```

Cost: recursive scanning, ambiguous keys, duplicate state, cross-branch analysis hard.

The new model flattens task folders and generates `context.json` per task from the manifest:

```json
{
  "id": "01a-catalog",
  "parents": ["01-survey"],
  "children": ["01a-i-inventory"],
  "depends_on": [],
  "depended_on_by": ["01b-report"],
  "siblings": ["01b-report"],
  "path": ".converge/playbooks/.../TASK.md"
}
```

This gives AI agents MORE context than nested folders (siblings, cross-branch deps — invisible in nested model) while keeping state queries O(1).

## Phases

| id | kind | goal | gating output |
|---|---|---|---|
| `extend-types` | container | Extend RunResults types; rename session→execution files; update paths | Typecheck + tests green; old session files gone |
| `run-results-manager` | container | Create RunResultsManager — single-file state replacing all checkpoint infra | RunResultsManager unit tests green |
| `integrate-runners` | container | Replace checkpoint calls in dag-runner, task-runner, seed-executor; generate context.json | Runners write run_results.json; each task dir has context.json |
| `migrate-cli` | container | All CLI commands use RunResultsManager/ExecutionLogger | Zero old checkpoint/session imports from CLI |
| `delete-checkpoint` | container | Inverted red-green: delete CheckpointManager, FilesystemTaskStatus, UnitCheckpointManager | Tombstone tests green; zero references to deleted modules |

## Phase detail

### Phase 1: extend-types

- Extend `RunResult.status` from `"pass"|"error"` to `"pending"|"running"|"pass"|"error"|"skipped"`
- Add `started_at`, `completed_at`, `error_message` to `RunResult`
- Replace `RunResults.metadata.session_id` with `execution_id`; add `playbook`, `manifest_hash`, `status`. No deprecated field.
- Create `execution-types.ts` — clean renamed copy of `session-types.ts`
- Create `execution-logger.ts` — clean renamed copy of `session-logger.ts`
- Delete `session-types.ts` and `session-logger.ts` — clean break
- Update all imports across the codebase to point to execution files
- Add `getExecutionsDir()`, `getExecutionDir()`, `getExecutionTaskDir()`, `getExecutionManifestPath()` to `structure.ts`
- Remove `getSessionsDir()` from `structure.ts`

### Phase 2: run-results-manager

Create `RunResultsManager` class:
- Constructor takes executionDir + manifest, initializes `run_results.json` with all nodes `pending`
- Mutations: `markRunning`, `markComplete`, `markFailed`, `markSkipped`, `incrementAttempt`
- Queries: `getNodeStatus`, `isComplete`, `isFailed`, `isLocked`, `getAttemptCount`, `getResultsSnapshot`
- Single JSON file, atomic writes via `atomic-write.ts`
- No filesystem scanning — O(1) reads

### Phase 3: integrate-runners

- Update `dag-runner.ts`: accept `RunResultsManager`, call lifecycle methods, propagate skips
- Create `context-generator.ts`: generate per-task `context.json` from manifest
- Update `task-runner.ts`: replace all checkpoint calls with `RunResultsManager`
- Update `seed-executor.ts`: execution-scoped paths, no checkpoint writes
- Update `ancestor-propagation.ts`, `loop-detector.ts`, `result-snapshot.ts`: read from run_results
- Journal paths: `executions/{id}/tasks/{taskId}/` — flat, all at same level

### Phase 4: migrate-cli

- `autonomous-run.ts`: replace SessionLogger→ExecutionLogger, CheckpointManager→RunResultsManager
- `commands-run.ts`: same migration
- `next-task.ts`: O(1) run_results read instead of O(n) filesystem scan
- `commands-validate.ts`, `reconcile.ts`: replace CheckpointManager usage
- `converge-runner.ts`: replace UnitCheckpointManager with RunResultsManager
- `task-executor.ts`, `spawn-runner.ts`: execution model migration

### Phase 5: delete-checkpoint

Inverted red-green:
1. Write tombstone tests asserting files don't exist (RED — they still exist)
2. Delete: `checkpoint/manager.ts`, `checkpoint/filesystem-status.ts`, `checkpoint/unit-checkpoint.ts`, `checkpoint/task-checkpoint.ts`
3. Prune `checkpoint/index.ts` — keep only `atomic-write.ts`
4. Tombstone tests go GREEN

## TDD discipline

- **Additions** (phases 1-2): red-green-refactor
- **Integrations** (phases 3-4): capture current behavior, swap to new code path
- **Deletions** (phase 5): inverted red-green

## Critical files

Created:
- `packages/core/src/manifest/run-results-manager.ts` (phase 2)
- `packages/core/src/manifest/context-generator.ts` (phase 3)
- `packages/core/src/journal/execution-types.ts` (phase 1)
- `packages/core/src/journal/execution-logger.ts` (phase 1)
- `packages/core/tests/manifest/run-results-manager.test.ts` (phase 2)
- `packages/core/tests/manifest/context-generator.test.ts` (phase 3)
- `packages/core/tests/checkpoint/checkpoint-deleted.test.ts` (phase 5, tombstone)

Modified:
- `packages/core/src/manifest/types.ts` — extend RunResult, RunResults (phase 1)
- `packages/core/src/journal/structure.ts` — execution-scoped paths; remove getSessionsDir (phase 1)
- `packages/core/src/dag/dag-runner.ts` — integrate RunResultsManager (phase 3)
- `packages/core/src/task/lifecycle/task-runner.ts` — replace checkpoints (phase 3)
- `packages/core/src/executor/seed-executor.ts` — execution paths (phase 3)
- All files importing session-types or session-logger (phase 1)
- All CLI consumers (phase 4)

Deleted:
- `packages/core/src/journal/session-types.ts` (phase 1)
- `packages/core/src/journal/session-logger.ts` (phase 1)
- `packages/core/src/checkpoint/manager.ts` (phase 5)
- `packages/core/src/checkpoint/filesystem-status.ts` (phase 5)
- `packages/core/src/checkpoint/unit-checkpoint.ts` (phase 5)
- `packages/core/src/checkpoint/task-checkpoint.ts` (phase 5)

## Pointers

- Predecessor playbooks: `cli-redesign`, `remove-goals`, `dbt-paradigm`, `declarative-discovery`
- Current checkpoint infrastructure: `packages/core/src/checkpoint/`
- Current session system: `packages/core/src/journal/session-logger.ts`, `session-types.ts`
- Integration point: `packages/core/src/dag/dag-runner.ts` (executeDag), `packages/core/src/task/lifecycle/task-runner.ts` (executeTask)
- Manifest types: `packages/core/src/manifest/types.ts`
