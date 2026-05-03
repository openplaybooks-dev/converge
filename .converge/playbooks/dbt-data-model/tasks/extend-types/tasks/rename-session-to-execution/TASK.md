---
id: rename-session-to-execution
title: Rename session→execution — create execution files, delete session files, update all imports
description: |
  Create execution-types.ts (clean copy of session-types.ts with all names
  renamed). Create execution-logger.ts (clean copy of session-logger.ts).
  Delete session-types.ts and session-logger.ts. Update ALL imports across
  the codebase. Clean break — no re-exports, no deprecated aliases.

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
    description: Zero imports of old session modules remain.

skills: []
references:
  - "packages/core/src/journal/session-types.ts"
  - "packages/core/src/journal/session-logger.ts"

vars: {}
dependencies: []
children:
  - red
  - green
---

# 02 — Rename session→execution

## Children

### red
Write grep-based checks that assert:
1. Old session files still exist (they do)
2. Execution files don't exist yet
3. Import statements reference session modules
Expected RED — session files exist, execution files don't.

### green
1. Create execution-types.ts from session-types.ts (all names renamed)
2. Create execution-logger.ts from session-logger.ts (all names renamed)
3. Delete session-types.ts and session-logger.ts
4. Update ALL imports across packages/ to point to execution files
5. Verify zero references to old session modules

## Type renames

| Old | New |
|-----|-----|
| `SessionEventType` | `ExecutionEventType` |
| `SessionEvent` | `ExecutionEvent` |
| `SessionMetadata` | `ExecutionMetadata` |
| `SessionConfig` | `ExecutionConfig` |
| `SessionOutcomes` | `ExecutionOutcomes` |
| `SessionStatus` | `ExecutionStatus` |
| `SessionHooks` | `ExecutionHooks` |
| `SessionLogger` | `ExecutionLogger` |
| `generateSessionId()` | `generateExecutionId()` |
| `getSessionsDir()` | `getExecutionsDir()` |

Event type strings also renamed: `SESSION_START` → `EXECUTION_START`, etc.
