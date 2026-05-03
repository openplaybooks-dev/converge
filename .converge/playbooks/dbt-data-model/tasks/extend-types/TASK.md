---
id: extend-types
title: "Extend RunResults types; rename session→execution; update journal paths"
description: |
  Extend the RunResult and RunResults types in manifest/types.ts to support
  full node lifecycle tracking. Create execution-types.ts and execution-logger.ts
  as clean renamed copies. Delete session-types.ts and session-logger.ts — no
  shims. Update structure.ts with execution-scoped path helpers. Update all
  imports across the codebase. Clean break, no backward compat.

inputs:
  - packages/core/src/manifest/types.ts
  - packages/core/src/journal/structure.ts

outputs:
  - packages/core/src/manifest/types.ts (modified)
  - packages/core/src/journal/execution-types.ts (new)
  - packages/core/src/journal/execution-logger.ts (new)
  - packages/core/src/journal/session-types.ts (deleted)
  - packages/core/src/journal/session-logger.ts (deleted)
  - packages/core/src/journal/structure.ts (modified)

checks:
  - id: execution-types-exists
    cmd: test -s packages/core/src/journal/execution-types.ts
    description: Execution types module exists.
  - id: execution-logger-exists
    cmd: test -s packages/core/src/journal/execution-logger.ts
    description: Execution logger module exists.
  - id: session-files-deleted
    cmd: "! test -f packages/core/src/journal/session-types.ts && ! test -f packages/core/src/journal/session-logger.ts"
    description: Old session files are deleted — clean break.
  - id: typecheck-green
    cmd: pnpm --filter @converge/core typecheck
    description: Core package typechecks after rename.

skills: []
references:
  - ".converge/playbook-chain.md"
  - "packages/core/src/manifest/types.ts"

vars: {}
dependencies: []
children:
  - contract-probe
  - extend-run-results-types
  - rename-session-to-execution
  - update-journal-structure
---

# 01 — Extend types and rename session→execution

This phase extends the manifest types and renames session concepts to
execution throughout the journal layer. Clean break — old session files
are deleted, not shimmed.

## Children

### contract-probe
Verify predecessor: declarative-discovery is merged (TaskDag, dag-runner
exist; task/tree/ deleted). Fails fast if predecessor contract is broken.

### extend-run-results-types
Extend `RunResult.status` from `"pass"|"error"` to `"pending"|"running"|"pass"|"error"|"skipped"`.
Add `started_at`, `completed_at`, `error_message` to `RunResult`.
Replace `RunResults.metadata.session_id` with `execution_id`; add `playbook`, `manifest_hash`, `status`.

### rename-session-to-execution
Create `execution-types.ts` (clean copy of session-types.ts with all names
renamed). Create `execution-logger.ts` (clean copy of session-logger.ts).
Delete `session-types.ts` and `session-logger.ts`. Update ALL imports
across the codebase. No re-exports, no deprecated aliases.

### update-journal-structure
Add `getExecutionsDir()`, `getExecutionDir()`, `getExecutionTaskDir()`,
`getExecutionManifestPath()` to structure.ts. Remove `getSessionsDir()`.
Update all callers to use new names.

## Done when

All checks pass. Execution files exist, session files gone, typecheck green.
