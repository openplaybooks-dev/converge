---
id: dag-data-model
title: "DAG primitives (DagNode, TaskDag, topological-sort); TASK.md schema accepts children: and from_seed:; design doc + REFS inventory"
description: |
  Land the DAG data model under packages/core/src/dag/ and extend the
  TASK.md frontmatter schema to accept children: and from_seed: fields.
  Also produce the design doc, REFS inventory, and migration catalog
  that every later phase reads as input. No loader or runner changes
  yet — schema and data model only.

  Strict red-green-refactor at every implementation leaf.

inputs:
  - docs/design/cli-redesign.md
  - .converge/playbooks/dbt-paradigm/PLAN.md
  - packages/core/src/config/loader.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/task-definition.ts
  - packages/core/src/manifest

outputs:
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/topological-sort.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/dag/index.ts
  - packages/core/src/config/task-definition.ts
  - packages/core/src/config/task-md-definition.ts
  - docs/design/declarative-discovery.md
  - .converge/playbooks/declarative-discovery/REFS.md
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json
  - .converge/playbooks/declarative-discovery/contract-probe-report.md

checks:
  - id: contract-probe-report-present
    cmd: test -s .converge/playbooks/declarative-discovery/contract-probe-report.md
    description: Contract probe ran and its report exists.
  - id: dag-node-exists
    cmd: test -s packages/core/src/dag/dag-node.ts
    description: DagNode module exists.
  - id: topological-sort-exists
    cmd: test -s packages/core/src/dag/topological-sort.ts
    description: Topological sort module exists.
  - id: task-dag-exists
    cmd: test -s packages/core/src/dag/task-dag.ts
    description: TaskDag module exists.
  - id: children-field-parses
    cmd: pnpm --filter @openplaybooks/converge-core test -- children-field
    description: "children: field parses bare-id, object, and mixed forms."
  - id: from-seed-field-parses
    cmd: pnpm --filter @openplaybooks/converge-core test -- from-seed-field
    description: "from_seed: field parses."
  - id: topological-sort-linear
    cmd: pnpm --filter @openplaybooks/converge-core test -- topological-sort -- linear
    description: Linear DAG (A→B→C) sorts correctly.
  - id: topological-sort-diamond
    cmd: pnpm --filter @openplaybooks/converge-core test -- topological-sort -- diamond
    description: Diamond DAG (A→[B,C]→D) sorts with B and C in the same layer.
  - id: topological-sort-cycle
    cmd: pnpm --filter @openplaybooks/converge-core test -- topological-sort -- cycle
    description: Cycle detection throws with the cycle path in the error message.
  - id: design-doc-present
    cmd: test -s docs/design/declarative-discovery.md
    description: Design doc exists and is non-empty.
  - id: refs-md-present
    cmd: test -s .converge/playbooks/declarative-discovery/REFS.md
    description: Tree-abstraction callsite inventory exists.
  - id: catalog-valid-json
    cmd: jq -e 'type == "array"' .converge/playbooks/declarative-discovery/playbooks-catalog.json
    description: Per-playbook migration catalog is a JSON array.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge typecheck
    description: Core and CLI typecheck after DAG primitives land.
  - id: baseline-tests-green
    cmd: pnpm -r test
    description: Baseline test suite green before any work begins.

skills: []
references:
  - "docs/design/cli-redesign.md"
  - ".converge/playbook-chain.md"
  - ".converge/playbooks/dbt-paradigm/PLAN.md"

vars: {}
dependencies: []
children:
  - contract-probe
  - dag-node
  - design-doc
  - refs-catalog
  - schema-extension
  - task-dag
  - topological-sort
---

# 01 — DAG data model + schema

This phase lands the foundation. No loader or runner changes — just the
DAG primitives and the schema accepting new TASK.md fields. The existing
tree-based execution continues to work unchanged.

## Children

### contract-probe
Verify predecessor surfaces: cli-redesign select module, remove-goals
goal-manager absent, dbt-paradigm child-synthesizer + seed-spawner +
seed/test schemas exist, WBS executor absent. Produces
`contract-probe-report.md`. Fails fast if any predecessor contract is
broken.

### dag-node
`DagNode` interface — pure data, no execution logic. Fields: id, parents,
children, depends_on, depended_on_by, taskDef, path, status, virtual.

### topological-sort
Kahn's algorithm: `topologicalSort(nodes)` returns layers,
`detectCycle(nodes)` returns cycle path or null.

### task-dag
`TaskDag` class: nodes map, roots array, getReady(), getDownstream(),
markComplete(), markFailed(), addNode(), topologicalOrder(),
toManifest(), fromManifest().

### schema-extension
Add `children:` and `from_seed:` to TaskDefinition type and TASK.md
frontmatter parser. Validation: non-empty ids, relative paths, no
duplicate ids per parent.

### design-doc
Write `docs/design/declarative-discovery.md` — the spec of record.
Sections: motivation, DAG primitives, children: syntax, path registry,
virtual nodes, DAG semantics, runner, cutover plan.

### refs-catalog
Write `REFS.md` (every tree-abstraction callsite to delete in phase 06)
and `playbooks-catalog.json` (every live playbook to migrate in phase 04).

## Done when

All checks pass. DAG primitives exist and are tested. TASK.md parses
the new fields. Design doc and inventories exist. Folder-scan unchanged.
