---
id: commands-tree
title: commands-tree.ts — topological layer display instead of tree display
description: |
  The tree command currently uses TaskTree.load() + printTaskTree() to
  render a nested tree. Replace with dag.topologicalOrder() — display
  tasks grouped by topological layer.

children:
  - commands-tree-red
  - commands-tree-green
---

# 03 — commands-tree.ts

### red
Write baseline test: `converge tree` outputs expected format.

### green
Replace tree rendering with topological layer display. Each layer
is a section. Children indented under parents. Baseline output
preserved (or improved).
