---
id: declarative-loader
title: "BFS declarative loader — walks children: declarations from playbook roots; path registry; cross-loader parity"
description: |
  Land the declarative loader that builds a TaskDag from declarations
  alone — no folder scanning. BFS-walks from playbook.yml roots through
  children: "declarations. Seeded tasks (from_seed:) become virtual nodes."
  A cross-loader parity test proves the declarative loader produces the
  same DAG as the current folder-scan loader for the fixture playbook.

inputs:
  - docs/design/declarative-discovery.md
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/task-definition.ts
  - packages/core/src/config/loader.ts
  - packages/cli/tests/fixtures/minimal-playbook

outputs:
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/config/path-registry.ts
  - packages/core/tests/config/declarative-loader.test.ts
  - packages/core/tests/config/loader-parity.test.ts

checks:
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge typecheck
    description: Core and CLI typecheck.
  - id: tests-green
    cmd: pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge test
    description: All tests pass.
  - id: declarative-loader-exists
    cmd: test -s packages/core/src/config/declarative-loader.ts
    description: Declarative loader module exists.
  - id: path-registry-exists
    cmd: test -s packages/core/src/config/path-registry.ts
    description: Path registry module exists.
  - id: parity-test-passes
    cmd: pnpm --filter @converge core test -- loader-parity
    description: Cross-loader parity test passes.
  - id: cycle-detection
    cmd: pnpm --filter @converge core test -- declarative-loader -- cycle
    description: "Cycle in children: declarations errors with the cycle path."
  - id: missing-child-errors
    cmd: pnpm --filter @converge core test -- declarative-loader -- missing
    description: A child id whose resolved path doesn't exist errors clearly.
  - id: duplicate-id-errors
    cmd: pnpm --filter @converge core test -- declarative-loader -- duplicate
    description: Two TASK.md files with the same id at different paths errors.
  - id: multi-parent-works
    cmd: pnpm --filter @converge core test -- declarative-loader -- multi-parent
    description: "A child id in two parents' children: lists produces two incoming edges."

skills: []
references:
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies:
  - 01-dag-data-model
children:
  - loader
  - parity-tests
  - path-registry
---

# 02 — Declarative loader

The loader is the most important deliverable in this playbook. It builds
a `TaskDag` from declarations alone — no filesystem scanning for task
discovery.

## Children

### 01-path-registry
`PathRegistry` class: `id → path` mapping, duplicate detection, idempotent
re-registration. Simple, pure data structure — no DAG awareness.

### declarative-loader
`buildDagFromPlaybook(playbookDir, rootTaskIds)` — BFS algorithm that:
1. Starts from playbook.yml roots
2. Reads each TASK.md, parses `children:` and `depends_on:`
3. Resolves child paths (default or `path:` override)
4. Registers in PathRegistry (error on duplicate)
5. Adds DagNodes and edges to the TaskDag
6. Creates virtual nodes for `from_seed:` tasks
7. Detects cycles after full DAG build

### 03-parity-tests
Cross-loader parity: load the fixture playbook under both the
declarative loader and the folder-scan loader. Assert identical node
sets and edge sets. This is the primary gate for phase 02.

## Done when

All checks pass. Both loaders produce identical DAGs for the fixture.
