---
id: path-registry-red
title: Red — failing tests for PathRegistry
description: |
  Write unit tests for the PathRegistry class. Run them. Confirm RED —
  path-registry.ts doesn't exist yet.

outputs:
  - packages/core/tests/config/path-registry.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/config/path-registry.test.ts
    description: Test file exists and is non-empty.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- path-registry 2>/dev/null"
    description: Tests fail (RED).
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/config/path-registry.test.ts | awk '$1+0 < 6 { exit 1 }'
    description: At least 6 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for PathRegistry

Write `packages/core/tests/config/path-registry.test.ts`.

## Test scenarios

1. **register + resolve**: `register('task-1', '/path/to/TASK.md')`.
   `resolve('task-1')` returns the path.

2. **resolve missing**: `resolve('nonexistent')` returns `null`.

3. **has**: `has('task-1')` returns `true` after register, `false` for
   unregistered ids.

4. **idempotent re-registration**: `register('task-1', '/same/path')`
   twice — second call is a no-op, doesn't throw.

5. **duplicate id with different path throws**: `register('task-1',
   '/path/a')` then `register('task-1', '/path/b')` throws
   `DuplicateIdError` with both paths in the message.

6. **entries iteration**: register three ids, `[...registry.entries()]`
   returns all three `[id, path]` pairs.

7. **empty registry**: new registry has `has()` false for any id,
   `entries()` yields nothing.

Run `pnpm --filter @converge core test -- path-registry` — import
fails (RED).
