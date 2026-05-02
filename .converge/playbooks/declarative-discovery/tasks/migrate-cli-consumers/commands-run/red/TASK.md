---
id: commands-run-red
title: Red — baseline test for commands-run
description: |
  Write a test that captures the current run command behavior.
  Run against minimal-playbook fixture. Assert tasks complete,
  exit code is 0, no crashes. This is the regression baseline.

outputs:
  - packages/cli/tests/commands-run.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/cli/tests/commands-run.test.ts
    description: Test file exists.
  - id: test-captures-baseline
    cmd: pnpm --filter @converge cli test -- commands-run
    description: Baseline test passes against current tree-based code.

tags:
  - tdd
  - red
---

# Red — baseline test for commands-run

Write `packages/cli/tests/commands-run.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const CLI = resolve('../../cli/dist/index.js');
const FIXTURE = resolve('../../cli/tests/fixtures/minimal-playbook');

describe('commands-run (baseline)', () => {
  it('executes playbook tasks to completion', () => {
    const out = execFileSync('node', [
      CLI, 'run',
      '--project-dir', FIXTURE,
      '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8' });

    expect(out).toBeDefined();
    // No crash, exit code 0 (implicit from execFileSync)
  });

  it('reports completed tasks', () => {
    const out = execFileSync('node', [
      CLI, 'run', '--project-dir', FIXTURE,
      '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8' });

    expect(out).toMatch(/complete|done|success/i);
  });
});
```

Run — should PASS (captures current tree-based behavior).
