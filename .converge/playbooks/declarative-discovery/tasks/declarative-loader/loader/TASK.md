---
id: loader
title: buildDagFromPlaybook() — BFS declarative loader
description: |
  Implement the core declarative loader. BFS-walks from playbook.yml roots
  through children: declarations. Never scans folders. Creates DagNodes
  for every discovered task, adds edges, detects cycles. Seeded tasks
  (from_seed:) become virtual nodes.

inputs:
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/path-registry.ts
  - packages/core/src/config/loader.ts

outputs:
  - packages/core/src/config/declarative-loader.ts
  - packages/core/tests/config/declarative-loader.test.ts

checks:
  - id: declarative-loader-exists
    cmd: test -s packages/core/src/config/declarative-loader.ts
    description: Module exists.
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- declarative-loader
    description: Declarative loader tests pass.
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

skills: []
references:
  - "packages/core/src/config/loader.ts"

vars: {}
dependencies: []
children:
  - loader-red
  - loader-green
---

# 02 — Declarative loader

`buildDagFromPlaybook()` reads declarations, never scans folders.

## API

```ts
export interface LoadError {
  type: 'cycle' | 'missing_child' | 'duplicate_id' | 'parse_error';
  message: string;
  path?: string;
  cycle?: string[];
}

export function buildDagFromPlaybook(
  playbookDir: string,
  rootTaskIds: string[],
): { dag: TaskDag; registry: PathRegistry; errors: LoadError[] };
```

## Algorithm

1. Initialize empty `TaskDag` and `PathRegistry`.
2. For each root task id from `playbook.yml`, resolve its path:
   `<playbookDir>/tasks/<id>/TASK.md` and register.
3. BFS queue starts with root ids.
4. For each dequeued id:
   a. Read and parse its TASK.md frontmatter.
   b. Create a `DagNode` with `taskDef` from parsed frontmatter.
   c. For each entry in `children:`:
      - Resolve path: if `path:` override, use it (relative to parent
        dir); otherwise default `<parentDir>/tasks/<childId>/TASK.md`.
      - Register in PathRegistry (collect error on duplicate).
      - If child node not yet in DAG, enqueue for BFS.
      - Add edge: parent.children ← childId, child.parents ← parentId.
   d. For each entry in `depends_on:`, add execution dependency edge.
   e. If `from_seed:` is set, create virtual child nodes (`.virtual:
      true`) for each seed entry. Register in DAG and PathRegistry.
5. After BFS completes, run `detectCycle()`. Error on cycle.
6. Return `{ dag, registry, errors }`.

## Children

### red
Write failing tests for the declarative loader. Cover: flat playbook,
nested with bare ids, explicit path override, cycle detection,
missing child, duplicate id, multi-parent, virtual nodes from
from_seed, depends_on edges.

### green
Implement `buildDagFromPlaybook()`. Run tests green.

## Done when

All tests pass. Loader builds correct DAG from declarations only.
