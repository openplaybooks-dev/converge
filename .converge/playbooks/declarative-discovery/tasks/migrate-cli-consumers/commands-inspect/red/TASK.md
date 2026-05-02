---
id: commands-inspect-red
title: Red — baseline test for commands-inspect
outputs: packages/cli/tests/commands-inspect.test.ts
checks:
  - id: test-file-exists
    cmd: test -s packages/cli/tests/commands-inspect.test.ts
  - id: baseline-passes
    cmd: pnpm --filter @converge cli test -- commands-inspect
tags: [tdd, red]
---

# Red — commands-inspect baseline

```ts
describe('commands-inspect', () => {
  it('shows task details', () => {
    const out = execFileSync('node', [CLI, 'inspect', 'root-task',
      '--project-dir', FIXTURE, '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8' });
    expect(out).toContain('root-task');
  });
});
```
