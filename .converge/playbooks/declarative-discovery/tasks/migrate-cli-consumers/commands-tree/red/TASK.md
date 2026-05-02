---
id: commands-tree-red
title: Red — baseline test for commands-tree
description: Write test capturing tree command output.
outputs: packages/cli/tests/commands-tree.test.ts
checks:
  - id: test-file-exists
    cmd: test -s packages/cli/tests/commands-tree.test.ts
  - id: baseline-passes
    cmd: pnpm --filter @converge cli test -- commands-tree
tags: [tdd, red]
---

# Red — commands-tree baseline

```ts
describe('commands-tree', () => {
  it('renders task hierarchy', () => {
    const out = execFileSync('node', [CLI, 'tree',
      '--project-dir', FIXTURE, '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8' });
    expect(out).toBeDefined();
    expect(out.length).toBeGreaterThan(0);
  });
});
```
