---
id: delete-task-tree
title: Delete packages/core/src/task/tree/ — entire directory
description: |
  INVERTED red-green. The task/tree/ directory contains TaskTree,
  TreeNode, traversal, visualizer, types, journal-tree — all tree
  abstractions. Delete the entire directory.

children:
  - delete-task-tree-red
  - delete-task-tree-green
---

# 01 — Delete task/tree/

### red
Write test asserting `task/tree/` does NOT exist. Run — RED because
it still does.

### green
`rm -rf packages/core/src/task/tree/`. Verify typecheck and tests
still pass. Re-run test — GREEN.
