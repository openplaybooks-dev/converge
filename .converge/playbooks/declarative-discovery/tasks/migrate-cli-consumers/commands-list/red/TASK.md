---
id: commands-list-red
title: Red — baseline test for commands-list
description: Write test capturing current list output. Run against fixture.
outputs:
  - packages/cli/tests/commands-list.test.ts
checks:
  - id: test-file-exists
    cmd: test -s packages/cli/tests/commands-list.test.ts
  - id: baseline-passes
    cmd: pnpm --filter @converge cli test -- commands-list
tags: [tdd, red]
---

# Red — commands-list baseline

Write `packages/cli/tests/commands-list.test.ts`:

```ts
describe('commands-list', () => {
  it('lists all tasks in a playbook', () => {
    const out = execFileSync('node', [CLI, 'list',
      '--project-dir', FIXTURE, '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8' });
    expect(out).toContain('root-task'); // adjust to actual task ids
  });

  it('respects --select filter', () => {
    const out = execFileSync('node', [CLI, 'list',
      '--project-dir', FIXTURE,
      '--playbook', 'minimal-playbook',
      '--select', 'root-task',
    ], { encoding: 'utf-8' });
    expect(out).toContain('root-task');
  });
});
```

Run — captures current behavior.
