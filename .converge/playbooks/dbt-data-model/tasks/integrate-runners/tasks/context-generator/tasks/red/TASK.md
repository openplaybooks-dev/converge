---
id: context-generator-red
title: Red — failing tests for context generator
description: |
  Write unit tests for context.json generation. Expected RED — module
  doesn't exist yet.

inputs:
  - packages/core/src/manifest/types.ts

outputs:
  - packages/core/tests/manifest/context-generator.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/manifest/context-generator.test.ts
    description: Test file exists and is non-empty.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- context-generator 2>/dev/null"
    description: Tests fail (RED) — module doesn't exist yet.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/manifest/context-generator.test.ts | awk '$1+0 < 5 { exit 1 }'
    description: At least 5 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for context generator

Write `packages/core/tests/manifest/context-generator.test.ts`. Cover:

1. **Single node**: root node has empty parents, empty siblings, correct children
2. **Linear DAG**: A→B→C — B has parent A, child C, sibling []
3. **Diamond DAG**: A→[B,C]→D — B and C are siblings
4. **Multiple parents**: node with two parents, siblings include children of both
5. **depends_on edges**: cross-branch deps appear in depends_on/depended_on_by
6. **Path preservation**: each node's `path` field matches manifest
7. **Status tracking**: initial status is "pending"
8. **File written**: context.json is actually written to the correct path

Use a minimal Manifest fixture. Verify each generated context.json has the
correct structure.

Run `pnpm --filter @converge/core test -- context-generator`. Expected RED.
