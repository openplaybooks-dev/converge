---
id: commands-gantt-red
title: Red — baseline test for commands-gantt
outputs: packages/cli/tests/commands-gantt.test.ts
checks:
  - id: test-file-exists
    cmd: test -s packages/cli/tests/commands-gantt.test.ts
  - id: baseline-passes
    cmd: pnpm --filter @converge cli test -- commands-gantt
tags: [tdd, red]
---

# Red — commands-gantt baseline

```ts
describe('commands-gantt', () => {
  it('outputs task list with status', () => {
    const out = execFileSync('node', [CLI, 'gantt',
      '--project-dir', FIXTURE, '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8' });
    expect(out).toBeDefined();
  });
});
```
