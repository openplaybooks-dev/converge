---
id: migrate-commands-run
title: Migrate commands-run.ts — same ExecutionLogger + RunResultsManager swap
description: |
  Same migration pattern as autonomous-run.ts. Replace SessionLogger with
  ExecutionLogger. Replace CheckpointManager with RunResultsManager.
  Clean break.

inputs:
  - packages/cli/src/commands-run.ts

outputs:
  - packages/cli/src/commands-run.ts (modified)

checks:
  - id: no-checkpoint-imports
    cmd: "! grep -q 'CheckpointManager' packages/cli/src/commands-run.ts"
    description: No checkpoint imports in commands-run.ts.
  - id: no-session-imports
    cmd: "! grep -q 'SessionLogger' packages/cli/src/commands-run.ts"
    description: No session imports in commands-run.ts.

skills: []
references:
  - "packages/cli/src/commands-run.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 02 — Migrate commands-run.ts

Follow the same pattern as migrate-autonomous-run:
- Replace SessionLogger → ExecutionLogger
- Replace CheckpointManager → RunResultsManager
- generateSessionId() → generateExecutionId()
- Task state queries via run_results.json
