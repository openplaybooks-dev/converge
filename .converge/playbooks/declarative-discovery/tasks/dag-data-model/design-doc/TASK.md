---
id: design-doc
title: Write docs/design/declarative-discovery.md — the spec of record
description: |
  Write the design document that serves as the spec of record for the
  entire declarative-discovery playbook. Every later phase references it.
  Single leaf — no red/green needed for docs.

inputs:
  - docs/design/cli-redesign.md
  - .converge/playbooks/dbt-paradigm/PLAN.md
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/topological-sort.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/manifest/types.ts

outputs:
  - docs/design/declarative-discovery.md

checks:
  - id: design-doc-present
    cmd: test -s docs/design/declarative-discovery.md
    description: Design doc exists and is non-empty.
  - id: design-doc-has-sections
    cmd: |
      grep -qE '^## Motivation' docs/design/declarative-discovery.md && \
      grep -qE '^## DAG primitives' docs/design/declarative-discovery.md && \
      grep -qE '^## The' docs/design/declarative-discovery.md
    description: Design doc has required sections.

skills: []
references:
  - "docs/design/cli-redesign.md"

vars: {}
dependencies: []
---

# 05 — Design doc

Write `docs/design/declarative-discovery.md`. This is the spec that
every later phase references.

## Required sections

### 1. Motivation
What the tree model costs us (folder-scan discovery, parent-child
computed from directory nesting, Unit.parent/children fields, ~1800
lines of next-task.ts). What a pure DAG buys (explicit declarations,
deterministic topological execution, virtual nodes for dynamic tasks,
no iterations, no waves).

### 2. DAG primitives
`DagNode` interface — every field documented. `DagNodeStatus` states.
Virtual vs concrete nodes. `TaskDag` class — nodes, roots, queries,
mutations, serialization.

### 3. The `children:` field
Hybrid syntax: bare id, object form with `path:` override, mixed
arrays. Validation rules. Relationship to directory nesting
(file structure = metadata, not structure).

### 4. The `from_seed:` field
Virtual nodes. Dynamic spawn at runtime. Integration with
child-synthesizer and seed-spawner from dbt-paradigm.

### 5. The path registry
`id → path` mapping. Duplicate detection. Path resolution rules
(default vs override).

### 6. DAG semantics
Multi-parent (DAG, not tree). Cycle detection. Explicit edges vs
implicit nesting. Siblings, depends_on, depended_on_by.

### 7. DAG runner
`executeDag()` — single topological pass. No iterations. No waves.
Layer-by-layer execution. Failed-node blocking. Dynamic spawn
mid-execution.

### 8. The cutover plan
Six phases. No fallback after phase 06. No env flag. Hard cutover.

### 9. Selector compatibility
`--select` grammar unchanged. Selectors work against DAG nodes the
same way they worked against tree nodes.

## Done when

Design doc exists, is non-empty, and has all required sections.
