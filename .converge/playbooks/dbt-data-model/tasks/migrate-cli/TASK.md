---
id: migrate-cli
title: "Migrate all CLI commands to RunResultsManager/ExecutionLogger"
description: |
  Every CLI command that reads or writes checkpoint state now uses
  RunResultsManager. Every CLI command that logs sessions now uses
  ExecutionLogger. Zero imports of old checkpoint or session modules
  from CLI packages. Clean break — no dual-path, no fallback.

inputs:
  - packages/cli/src/autonomous-run.ts
  - packages/cli/src/commands-run.ts
  - packages/cli/src/next-task.ts
  - packages/cli/src/commands-validate.ts
  - packages/cli/src/reconcile.ts
  - packages/core/src/converge/converge-runner.ts

outputs:
  - packages/cli/src/autonomous-run.ts (modified)
  - packages/cli/src/commands-run.ts (modified)
  - packages/cli/src/next-task.ts (modified)
  - packages/cli/src/commands-validate.ts (modified)
  - packages/cli/src/reconcile.ts (modified)
  - packages/core/src/converge/converge-runner.ts (modified)

checks:
  - id: no-checkpoint-imports-cli
    cmd: "! grep -rln --exclude-dir=dist --exclude-dir=dist-pinned 'CheckpointManager\\|FilesystemTaskStatus\\|UnitCheckpointManager' packages/cli/"
    description: Zero checkpoint imports from CLI.
  - id: no-session-imports-cli
    cmd: "! grep -rln --exclude-dir=dist --exclude-dir=dist-pinned 'SessionLogger\\|session-types\\|session-logger' packages/cli/"
    description: Zero session imports from CLI.
  - id: tests-green
    cmd: pnpm --filter @openplaybooks/converge test
    description: CLI tests pass.

skills: []
references:
  - "packages/cli/src/"

vars: {}
dependencies: []
children:
  - migrate-autonomous-run
  - migrate-commands-run
  - migrate-next-task
---

# 04 — Migrate CLI consumers

## Children

### migrate-autonomous-run
Replace SessionLogger→ExecutionLogger, CheckpointManager→RunResultsManager.
`--resume` reads previous execution's run_results.json instead of checkpoint files.

### migrate-commands-run
Same migration: SessionLogger→ExecutionLogger, CheckpointManager→RunResultsManager.

### migrate-next-task
Replace O(n) filesystem scan (FilesystemTaskStatus) with O(1) run_results
read. State maps built from run_results.json instead of recursive directory walk.

## What changes

| Old | New |
|-----|-----|
| `new SessionLogger(...)` | `new ExecutionLogger(...)` |
| `generateSessionId()` | `generateExecutionId()` |
| `new CheckpointManager(dir)` | `new RunResultsManager(dir, manifest)` |
| `checkpoint.isTaskLocked(id)` | `runResults.isLocked(id)` |
| `checkpoint.getTaskAttemptCount(id)` | `runResults.getAttemptCount(id)` |
| `checkpoint.markTaskCompleted(id)` | `runResults.markComplete(id, duration)` |
| `checkpoint.markTaskFailed(id)` | `runResults.markFailed(id, error, duration)` |
| `checkpoint.getCompletedTasks()` | `runResults.getResultsSnapshot()` |
| `filesystemStatus.getStatusMap()` | `runResults.getResultsSnapshot()` |
