---
id: migrate-autonomous-run
title: Migrate autonomous-run.ts — ExecutionLogger + RunResultsManager
description: |
  Replace SessionLogger with ExecutionLogger. Replace CheckpointManager
  with RunResultsManager. --resume reads previous run_results.json.
  Clean break — no fallback to old checkpoint system.

inputs:
  - packages/cli/src/autonomous-run.ts
  - packages/core/src/manifest/run-results-manager.ts
  - packages/core/src/journal/execution-logger.ts

outputs:
  - packages/cli/src/autonomous-run.ts (modified)

checks:
  - id: no-checkpoint-imports
    cmd: "! grep -q 'CheckpointManager\\|FilesystemTaskStatus\\|UnitCheckpointManager' packages/cli/src/autonomous-run.ts"
    description: No checkpoint imports in autonomous-run.ts.
  - id: no-session-imports
    cmd: "! grep -q 'SessionLogger\\|session-types\\|session-logger' packages/cli/src/autonomous-run.ts"
    description: No session imports in autonomous-run.ts.

skills: []
references:
  - "packages/cli/src/autonomous-run.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 01 — Migrate autonomous-run.ts

## Children

### red
Verify autonomous-run.ts imports checkpoint and session modules.
Expected RED — not yet migrated.

### green
Replace all imports. ExecutionLogger for session lifecycle.
RunResultsManager for task state. `--resume` reads previous
execution's run_results.json.
