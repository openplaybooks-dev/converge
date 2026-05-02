---
id: update-exports-red
title: Red — index.ts still exports tree symbols
checks:
  - id: exports-tree
    cmd: grep -q 'task/tree' packages/core/src/index.ts
    description: Tree exports still in index.ts (RED).
tags: [tdd, red, inverted]
---

# Red — tree exports still in index.ts

```ts
it('index.ts does not export tree symbols', () => {
  const indexContent = readFileSync('packages/core/src/index.ts', 'utf-8');
  expect(indexContent).not.toMatch(/task\/tree/);
  expect(indexContent).not.toMatch(/TaskTree/);
});
```

Run — RED. Tree exports still present.
