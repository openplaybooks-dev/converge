---
id: rename-session-to-execution-red
title: Red — verify old session files exist, execution files don't
description: |
  Write checks that assert the current state: session files exist,
  execution files don't, imports reference session modules.
  Expected RED — this is the state before the rename.

inputs: []

outputs: []

checks:
  - id: session-types-exists
    cmd: test -f packages/core/src/journal/session-types.ts
    description: session-types.ts still exists.
  - id: session-logger-exists
    cmd: test -f packages/core/src/journal/session-logger.ts
    description: session-logger.ts still exists.
  - id: execution-types-missing
    cmd: "! test -f packages/core/src/journal/execution-types.ts"
    description: execution-types.ts does NOT exist yet (RED).
  - id: execution-logger-missing
    cmd: "! test -f packages/core/src/journal/execution-logger.ts"
    description: execution-logger.ts does NOT exist yet (RED).
  - id: session-imports-present
    cmd: grep -rln 'session-types\|session-logger' packages/ > /dev/null 2>&1
    description: Imports of session modules exist (RED — not yet migrated).

tags:
  - tdd
  - red
---

# Red — pre-rename state check

Verify the current state before the rename:
- `session-types.ts` and `session-logger.ts` exist
- `execution-types.ts` and `execution-logger.ts` do NOT exist
- Import statements throughout packages/ reference session modules

All these checks should pass (confirming the RED baseline). The rename
hasn't happened yet.
