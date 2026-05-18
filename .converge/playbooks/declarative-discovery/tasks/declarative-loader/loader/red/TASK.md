---
id: loader-red
title: Red — failing tests for buildDagFromPlaybook()
description: |
  Write unit tests for the declarative loader. Each test creates a
  temporary playbook directory with TASK.md files and children:
  declarations, then asserts the produced TaskDag has correct nodes
  and edges. Run them. Confirm RED — the loader doesn't exist yet.

outputs:
  - packages/core/tests/config/declarative-loader.test.ts

checks:
  - id: test-file-exists
    cmd: test -s packages/core/tests/config/declarative-loader.test.ts
    description: Test file exists.
  - id: tests-fail
    cmd: "! pnpm --filter @openplaybooks/converge-core test -- declarative-loader 2>/dev/null"
    description: Tests fail (RED) — module doesn't exist.
  - id: tests-have-assertions
    cmd: grep -cE 'expect\(|assert' packages/core/tests/config/declarative-loader.test.ts | awk '$1+0 < 10 { exit 1 }'
    description: At least 10 assertions.

tags:
  - tdd
  - red
---

# Red — failing tests for declarative loader

Write `packages/core/tests/config/declarative-loader.test.ts`.

## Test helper

```ts
function tmpPlaybook(files: Record<string, string>): string {
  // Create temp dir, write each file, return dir path
}
```

## Test scenarios

### 1. Flat playbook (roots only)
Two root tasks with a `playbook.yml` listing `['A', 'B']`. Neither has
`children:`. Result: DAG with two nodes, no edges. Both are roots.

### 2. Nested with bare ids
A has `children: ['B', 'C']`, B has `children: ['D']`. Result: 4 nodes.
A.parents = [], A.children = ['B', 'C']. B.parents = ['A'],
B.children = ['D']. D.parents = ['B']. Roots = [A].

### 3. Explicit path override
A has `children: [{ id: 'B', path: '../shared/B/TASK.md' }]` where
the file is not at the default location. Result: B is discovered at
the custom path and registered.

### 4. Cycle detection
A has `children: ['B']`, B has `children: ['C']`, C has `children:
['A']`. Result: `errors` contains a cycle error with path [A, B, C, A].

### 5. Missing child path
A has `children: ['B']` but no TASK.md exists at the resolved path.
Result: `errors` contains a missing_child error.

### 6. Duplicate id at different paths
Two parents declare children with the same id but different paths.
Result: `errors` contains a duplicate_id error.

### 7. Multi-parent
Both A and B have `children: ['C']`. Result: C.parents = ['A', 'B'].
Both A and B have C in their children.

### 8. Virtual nodes from from_seed
A has `from_seed: 'per-token'`. Result: a virtual DagNode is created
for the seed (`.virtual: true`). Its `parents` includes A.

### 9. depends_on edges
A has `children: ['B']` and B has `depends_on: ['X']` where X is
another task. Result: B.depends_on = ['X'], X.depended_on_by includes
'B'.

### 10. Empty playbook
No root tasks. Result: empty DAG, no errors.

Run `pnpm --filter @converge core test -- declarative-loader` — fails
(RED).
