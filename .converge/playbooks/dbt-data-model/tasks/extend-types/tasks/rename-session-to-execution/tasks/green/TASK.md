---
id: rename-session-to-execution-green
title: Green — create execution files, delete session files, update all imports
description: |
  Create execution-types.ts and execution-logger.ts. Delete session-types.ts
  and session-logger.ts. Update ALL imports across the codebase. Clean break.

inputs:
  - packages/core/src/journal/session-types.ts
  - packages/core/src/journal/session-logger.ts

outputs:
  - packages/core/src/journal/execution-types.ts (new)
  - packages/core/src/journal/execution-logger.ts (new)
  - packages/core/src/journal/session-types.ts (deleted)
  - packages/core/src/journal/session-logger.ts (deleted)

checks:
  - id: execution-files-exist
    cmd: test -s packages/core/src/journal/execution-types.ts && test -s packages/core/src/journal/execution-logger.ts
    description: Both execution files exist.
  - id: session-files-deleted
    cmd: "! test -f packages/core/src/journal/session-types.ts && ! test -f packages/core/src/journal/session-logger.ts"
    description: Old session files are deleted.
  - id: no-session-imports
    cmd: "! grep -rln 'session-types\\|session-logger' packages/ 2>/dev/null"
    description: Zero imports of old session modules.
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: All packages typecheck after rename.

tags:
  - tdd
  - green
---

# Green — execute the rename

## Step 1: Create execution-types.ts

Copy `session-types.ts` → `execution-types.ts`. Rename ALL types:
- `SessionEventType` → `ExecutionEventType`
- `SessionEvent` → `ExecutionEvent`
- `SessionMetadata` → `ExecutionMetadata`
- `SessionConfig` → `ExecutionConfig`
- `SessionOutcomes` → `ExecutionOutcomes`
- `SessionStatus` → `ExecutionStatus`
- `SessionHooks` → `ExecutionHooks`

Rename event type strings:
- `SESSION_START` → `EXECUTION_START`
- `SESSION_END` → `EXECUTION_END`

Rename hook names:
- `session:start` → `execution:start`
- `session:iteration` → `execution:iteration`
- `session:complete` → `execution:complete`

## Step 2: Create execution-logger.ts

Copy `session-logger.ts` → `execution-logger.ts`. Rename:
- `SessionLogger` → `ExecutionLogger`
- `generateSessionId()` → `generateExecutionId()`
- `getSessionsDir()` → `getExecutionsDir()`
- All `sessionId` → `executionId`
- All `sessionDir` → `executionDir`
- All `sessionLogPath` → `executionLogPath`
- All method names with `Session` → `Execution`

## Step 3: Delete old files

```bash
rm packages/core/src/journal/session-types.ts
rm packages/core/src/journal/session-logger.ts
```

Also update journal/index.ts exports.

## Step 4: Update all imports

Run `grep -rln 'session-types\|session-logger' packages/` to find every
file that imports session modules. For each:
- Replace `session-types` import with `execution-types`
- Replace `session-logger` import with `execution-logger`
- Replace all used type/function names with new names

## Verification

- `pnpm -r typecheck` passes
- `grep -rln 'session-types\|session-logger' packages/` returns nothing
