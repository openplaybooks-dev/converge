---
id: dag-node-red
title: Red — failing tests for DagNode interface
description: |
  Write unit tests that capture the DagNode contract. Run them. Confirm
  RED — the source file doesn't exist yet, so imports fail.

inputs:
  - packages/core/src/config/task-definition.ts

outputs:
  - packages/core/tests/dag/dag-node.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/dag/dag-node.test.ts
    description: DagNode test file exists and is non-empty.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- dag-node 2>/dev/null"
    description: Tests fail (RED) — dag-node.ts does not exist yet.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/dag/dag-node.test.ts | awk '$1+0 < 5 { exit 1 }'
    description: At least 5 assertions (no faking RED with empty tests).

tags:
  - tdd
  - red
---

# Red — failing tests for DagNode

Write `packages/core/tests/dag/dag-node.test.ts`. Cover:

1. **Default status**: a DagNode with status unset defaults to `'pending'`
2. **Empty arrays**: `parents`, `children`, `depends_on`, `depended_on_by`
   default to `[]`
3. **Status type**: `DagNodeStatus` accepts exactly the five values:
   `'pending' | 'ready' | 'running' | 'complete' | 'failed'`
4. **virtual defaults to false**: a concrete node (from a TASK.md) has
   `virtual: false`
5. **virtual can be true**: a node with `virtual: true` represents a
   seeded/dynamic task
6. **path is string**: `path` is a required string
7. **taskDef is required**: TypeScript error if `taskDef` is missing
8. **Structural typing**: a plain object matching the interface is
   assignable to `DagNode` (interface, not class)

Use `vitest` with `expectTypeOf` or structural assignment tests.

Run `pnpm --filter @converge/core test -- dag-node`. The import of
`dag-node.ts` fails because the file doesn't exist. That's the RED state.

**Discipline:** if any test passes, the implementation already exists.
Fix the test.
