---
id: delete-task-tree-red
title: Red — test that task/tree/ does NOT exist (inverted)
description: |
  Write assertions that the tree directory and its files do not exist.
  Run them. Expected RED — the directory still exists on disk.

outputs:
  - packages/core/tests/no-tree-abstractions.test.ts (initial)

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/no-tree-abstractions.test.ts
    description: Test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @converge core test -- no-tree-abstractions 2>/dev/null"
    description: Tests fail (RED) — tree/ still exists.

tags: [tdd, red, inverted]
---

# Red — task/tree/ should not exist

```ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';

describe('no tree abstractions', () => {
  const TREE_DIR = 'packages/core/src/task/tree';

  it('task/tree/ directory does not exist', () => {
    expect(existsSync(TREE_DIR)).toBe(false);
  });

  it('task-tree.ts does not exist', () => {
    expect(existsSync(`${TREE_DIR}/task-tree.ts`)).toBe(false);
  });

  it('tree-node.ts does not exist', () => {
    expect(existsSync(`${TREE_DIR}/tree-node.ts`)).toBe(false);
  });

  it('traversal.ts does not exist', () => {
    expect(existsSync(`${TREE_DIR}/traversal.ts`)).toBe(false);
  });

  it('visualizer.ts does not exist', () => {
    expect(existsSync(`${TREE_DIR}/visualizer.ts`)).toBe(false);
  });

  it('index.ts does not exist', () => {
    expect(existsSync(`${TREE_DIR}/index.ts`)).toBe(false);
  });
});
```

Run `pnpm --filter @converge core test -- no-tree-abstractions` —
all assertions fail because the directory still exists. RED.
