---
id: delete-tree-utils
title: Delete packages/core/src/checkpoint/tree-utils.ts
description: Delete tree-specific checkpoint utilities (hashTaskTree, discoverTaskHierarchy).
children:
  - delete-tree-utils-red
  - delete-tree-utils-green
---

# 03 — Delete tree-utils.ts

### red
Add assertion: `expect(existsSync('packages/core/src/checkpoint/tree-utils.ts')).toBe(false)`. RED.

### green
`rm packages/core/src/checkpoint/tree-utils.ts`. GREEN.
