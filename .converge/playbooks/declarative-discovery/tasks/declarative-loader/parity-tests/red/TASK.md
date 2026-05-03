---
id: parity-tests-red
title: Red — write cross-loader parity test
description: |
  Write loader-parity.test.ts. Load the fixture under both loaders.
  Compare node sets and edge sets. Expected RED — either the fixture
  lacks children: declarations or the loaders diverge.

inputs:
  - packages/cli/tests/fixtures/minimal-playbook

outputs:
  - packages/core/tests/config/loader-parity.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/config/loader-parity.test.ts
    description: Parity test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/core test -- loader-parity 2>/dev/null"
    description: Parity test fails (RED) — fixture not yet declarative.

tags:
  - tdd
  - red
---

# Red — cross-loader parity test

Write `packages/core/tests/config/loader-parity.test.ts`.

## Test

```ts
import { describe, it, expect } from 'vitest';
import { buildDagFromPlaybook } from '../../src/config/declarative-loader.js';
// Import the existing folder-scan loader
import { loadPlaybookTasks } from '../../src/config/loader.js';

const FIXTURE = resolve('../../cli/tests/fixtures/minimal-playbook');

describe('cross-loader parity', () => {
  it('produces identical node sets and edge sets', () => {
    // 1. Load via folder-scan
    const treeResult = loadPlaybookTasks(FIXTURE);

    // 2. Load via declarative (requires children: declarations on fixture)
    const { dag } = buildDagFromPlaybook(FIXTURE, ['root-task']);

    // 3. Compare node ids
    const treeIds = new Set(treeResult.tasks.map(t => t.id));
    const dagIds = new Set(dag.nodes.keys());
    expect(dagIds).toEqual(treeIds);

    // 4. Compare edges (parent → child pairs)
    const treeEdges = new Set<string>();
    for (const task of treeResult.tasks) {
      for (const child of task.children ?? []) {
        treeEdges.add(`${task.id}→${child.id}`);
      }
    }
    const dagEdges = new Set<string>();
    for (const node of dag.nodes.values()) {
      for (const childId of node.children) {
        dagEdges.add(`${node.id}→${childId}`);
      }
    }
    expect(dagEdges).toEqual(treeEdges);
  });
});
```

Run it — expected RED because the fixture doesn't have `children:`
declarations yet (the declarative loader finds nothing, or crashes).

**Note:** If the folder-scan loader and declarative loader use
different return types, adapt accordingly. The point is comparing the
resulting DAG structure.
