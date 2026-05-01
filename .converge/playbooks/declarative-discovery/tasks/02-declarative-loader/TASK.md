---
title: BFS declarative loader walks children: declarations from playbook.yml roots; path registry; cross-loader parity test
description: |
  Land packages/core/src/config/declarative-loader.ts. It reads
  playbook.yml's tasks: as roots, then BFS-walks the DAG by following
  children: declarations on each TASK.md. Never scans tasks/ blindly.
  A cross-loader parity test asserts the declarative loader produces
  the same node set and edge set as the existing folder-scan loader
  for the fixture playbook.

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
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass with folder-scan still default.
  - id: declarative-loader-exists
    cmd: test -s packages/core/src/config/declarative-loader.ts
    description: Declarative loader module exists.
  - id: path-registry-exists
    cmd: test -s packages/core/src/config/path-registry.ts
    description: Path registry module exists.
  - id: parity-test-passes
    cmd: pnpm --filter @converge/core test -- loader-parity
    description: Cross-loader parity test asserts identical node set and edge set.
  - id: cycle-detection
    cmd: pnpm --filter @converge/core test -- declarative-loader -- cycle
    description: Cycle in children: declarations errors with the cycle path.
  - id: missing-child-errors
    cmd: pnpm --filter @converge/core test -- declarative-loader -- missing
    description: A child id whose resolved path doesn't exist errors clearly.
  - id: duplicate-id-errors
    cmd: pnpm --filter @converge/core test -- declarative-loader -- duplicate
    description: Two TASK.md files with the same id at different paths errors.
  - id: multi-parent-works
    cmd: pnpm --filter @converge/core test -- declarative-loader -- multi-parent
    description: A child id in two parents' children: lists produces two incoming edges.

skills: []
references:
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies:
  - 01-dag-data-model
---

# 02 — Declarative loader

The loader is the most important deliverable in this playbook. It builds
a `TaskDag` from declarations alone — no filesystem scanning for task
discovery.

## What lands

### `declarative-loader.ts`

```ts
export function buildDagFromPlaybook(
  playbookDir: string,
  rootTaskIds: string[],
): { dag: TaskDag; registry: PathRegistry; errors: LoadError[] };
```

Algorithm:
1. Initialize empty `TaskDag` and `PathRegistry`.
2. For each root task id from `playbook.yml`, resolve its path
   (`<playbookDir>/tasks/<id>/TASK.md`) and register.
3. BFS: read each TASK.md, parse `children:` and `depends_on:`.
4. For each declared child:
   - Resolve path: if object form with `path:`, use it; otherwise
     default to `<parentDir>/tasks/<id>/TASK.md`.
   - Register `id → path`. Error on duplicate id with different path.
   - Add `DagNode` to the DAG if not already present.
   - Add edge: parent → child.
   - Enqueue child for BFS.
5. For `depends_on:`, add execution dependency edges.
6. Cycle detection after full DAG build. Error with cycle path.
7. Return `{ dag, registry, errors }`.

### `path-registry.ts`

```ts
export interface PathRegistry {
  register(id: string, path: string): void;
  resolve(id: string): string | null;
  has(id: string): boolean;
  entries(): IterableIterator<[string, string]>;
}
```

### `loader.ts` integration

Gate at the top of the existing load function. When
`CONVERGE_DECLARATIVE_DISCOVERY=1`, route through
`buildDagFromPlaybook()`. Otherwise existing folder-scan unchanged.

### Cross-loader parity test

`packages/core/tests/config/loader-parity.test.ts`:
- Load the fixture under both loaders.
- Assert: same task ids, same parent-child edges.
- Run for flat and nested fixtures.

## TDD discipline

Must-have leaves:
1. Flat playbook (root tasks only).
2. Nested playbook (`children:` bare ids).
3. Explicit-path playbook (`children:` object form).
4. Cycle detection.
5. Missing child path error.
6. Duplicate id error.
7. Cross-loader parity.

## Done when

All checks pass. Both loaders produce identical DAGs for the fixture.
Folder-scan unchanged when flag off.
