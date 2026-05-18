---
id: migrate-commands-run-green
title: Green — migrate commands-run to ExecutionLogger + RunResultsManager
description: |
  Replace all checkpoint and session imports. Tests pass. Typecheck green.

inputs:
  - packages/cli/src/commands-run.ts

outputs:
  - packages/cli/src/commands-run.ts (modified)

checks:
  - id: no-checkpoint-imports
    cmd: "! grep -q 'CheckpointManager' packages/cli/src/commands-run.ts"
    description: No checkpoint imports.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-cli typecheck
    description: CLI typechecks.

tags:
  - tdd
  - green
---

# Green — migrate commands-run.ts

Same migration pattern as autonomous-run:
- Import ExecutionLogger, RunResultsManager
- Replace all checkpoint/session references
- Typecheck green
