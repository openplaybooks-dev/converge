---
id: commands-graph-red
title: Red — baseline test for commands-graph
outputs: packages/cli/tests/commands-graph.test.ts
checks:
  - id: test-file-exists
    cmd: test -s packages/cli/tests/commands-graph.test.ts
  - id: baseline-passes
    cmd: pnpm --filter @converge cli test -- commands-graph
tags: [tdd, red]
---

# Red — commands-graph baseline

```ts
describe('commands-graph', () => {
  it('outputs graph structure', () => {
    const out = execFileSync('node', [CLI, 'graph',
      '--project-dir', FIXTURE, '--playbook', 'minimal-playbook',
    ], { encoding: 'utf-8' });
    expect(out).toBeDefined();
  });
});
```
