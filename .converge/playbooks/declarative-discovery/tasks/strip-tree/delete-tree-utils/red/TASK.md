---
id: delete-tree-utils-red
title: Red — test that tree-utils.ts does NOT exist
checks:
  - id: tests-fail
    cmd: "! pnpm --filter @converge core test -- no-tree-abstractions 2>/dev/null"
tags: [tdd, red, inverted]
---

# Red — tree-utils.ts should not exist

Add to tombstone test:
```ts
it('tree-utils.ts does not exist', () => {
  expect(existsSync('packages/core/src/checkpoint/tree-utils.ts')).toBe(false);
});
```

Run — RED.
