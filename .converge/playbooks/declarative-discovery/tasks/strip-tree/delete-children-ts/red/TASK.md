---
id: delete-children-ts-red
title: Red — test that children.ts does NOT exist
outputs: packages/core/tests/no-tree-abstractions.test.ts (updated)
checks:
  - id: tests-fail
    cmd: "! pnpm --filter @converge core test -- no-tree-abstractions 2>/dev/null"
tags: [tdd, red, inverted]
---

# Red — children.ts should not exist

Add to tombstone test:
```ts
it('children.ts does not exist', () => {
  expect(existsSync('packages/core/src/task/unit/children.ts')).toBe(false);
});

it('no discoverChildren in source', () => {
  // This will be checked by a separate grep check
});
```

Run — RED. children.ts still exists.
