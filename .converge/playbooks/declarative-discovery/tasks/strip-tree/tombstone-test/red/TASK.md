---
id: tombstone-test-red
title: Red — comprehensive tombstone test
description: Write all negative assertions. Run — some fail (RED) until all deletions complete.
outputs: packages/core/tests/no-tree-abstractions.test.ts (final)
checks:
  - id: tests-fail
    cmd: "! pnpm --filter @converge core test -- no-tree-abstractions 2>/dev/null"
tags: [tdd, red, inverted]
---

# Red — tombstone test

Write the complete `packages/core/tests/no-tree-abstractions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve('../../../..'); // project root

function srcPath(p: string) { return resolve(ROOT, p); }

describe('no tree abstractions', () => {
  // Directories
  it('task/tree/ directory does not exist', () => {
    expect(existsSync(srcPath('packages/core/src/task/tree'))).toBe(false);
  });

  // Files
  it('children.ts does not exist', () => {
    expect(existsSync(srcPath('packages/core/src/task/unit/children.ts'))).toBe(false);
  });

  it('tree-utils.ts does not exist', () => {
    expect(existsSync(srcPath('packages/core/src/checkpoint/tree-utils.ts'))).toBe(false);
  });

  // Unit class
  it('Unit class has no parent field', () => {
    const unitSrc = readFileSync(srcPath('packages/core/src/task/unit/unit.ts'), 'utf-8');
    expect(unitSrc).not.toMatch(/parent.*:.*Unit/);
    expect(unitSrc).not.toMatch(/children\?.*:.*Unit\[\]/);
    expect(unitSrc).not.toMatch(/sortIndex/);
  });

  // Exports
  it('index.ts exports DAG, not tree', () => {
    const indexSrc = readFileSync(srcPath('packages/core/src/index.ts'), 'utf-8');
    expect(indexSrc).toContain('dag');
    expect(indexSrc).not.toMatch(/task\/tree/);
  });

  // Behavioral
  it('undeclared TASK.md files are not discovered', async () => {
    // Create a TASK.md in a directory not declared by any parent
    // Load the playbook — the undeclared task should NOT appear
    const { dag } = buildDagFromPlaybook(fixtureDir, roots);
    expect(dag.nodes.has('undeclared-task')).toBe(false);
  });

  // Codebase grep (run as script, not in vitest)
  // These are verified via the checks in playbook.yml
});
```

Run — some assertions fail because deletions are still in progress.
This is RED. Expected.
