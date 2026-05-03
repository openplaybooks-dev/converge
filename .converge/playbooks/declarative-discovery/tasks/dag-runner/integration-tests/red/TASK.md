---
id: integration-tests-red
title: Red — write CLI integration test for DAG runner
description: |
  Write an integration test that invokes the CLI and asserts tasks
  execute via the DAG runner in topological order. Expected RED —
  CLI doesn't use DAG runner yet.

outputs:
  - packages/cli/tests/integration/dag-runner.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/cli/tests/integration/dag-runner.test.ts
    description: Test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @converge/cli test -- dag-runner 2>/dev/null"
    description: Tests fail (RED).

tags:
  - tdd
  - red
---

# Red — CLI integration test

Write `packages/cli/tests/integration/dag-runner.test.ts`.

## Test

```ts
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const CLI = resolve('../../cli/dist/index.js');
const FIXTURE = resolve('../../cli/tests/fixtures/minimal-playbook');

describe('DAG runner — CLI integration', () => {
  it('executes linear playbook in topological order', () => {
    const result = execFileSync('node', [
      CLI, 'run',
      '--project-dir', FIXTURE,
      '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8', env: { ...process.env, CONVERGE_USE_DAG: '1' } });

    // Tasks complete successfully
    expect(result).toContain('completed');
    // No iteration/wave messages
    expect(result).not.toContain('iteration');
    expect(result).not.toContain('wave');
  });

  it('stops on failed blocking task', () => {
    // Use a fixture variant where one task is guaranteed to fail
    // Assert downstream tasks are not executed
  });

  it('resumes from completed tasks', () => {
    // Run once to complete task A, run again — A is skipped
  });
});
```

Run — expected RED. CLI doesn't know about `CONVERGE_USE_DAG` or the
DAG runner yet.
