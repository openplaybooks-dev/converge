---
id: commands-inspect
title: commands-inspect.ts — dag.nodes.get(id) lookup
description: Replace walkTaskTree() with dag.nodes.get(id) for task inspection.
children:
  - commands-inspect-red
  - commands-inspect-green
---

# 06 — commands-inspect.ts

### red
Write baseline test for `converge inspect <task-id>` output.

### green
Replace `walkTaskTree()` with `dag.nodes.get(id)`. Task details
come from `DagNode.taskDef`.
