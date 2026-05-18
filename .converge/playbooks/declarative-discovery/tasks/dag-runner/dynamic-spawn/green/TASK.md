---
id: dynamic-spawn-green
title: Green — implement dynamic spawn in executeDag
description: |
  Add spawn logic to executeDag. After a node completes, check its
  taskDef.from_seed. If set, call child-synthesizer and add resulting
  concrete nodes to the DAG. Update topological order for remaining
  layers.

inputs:
  - packages/core/tests/dag/dag-runner-spawn.test.ts
  - packages/core/src/runtime/child-synthesizer.ts
  - packages/core/src/runtime/seed-spawner.ts

outputs:
  - packages/core/src/dag/dag-runner.ts

checks:
  - id: spawn-tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- dag-runner-spawn
    description: All spawn tests pass (GREEN).
  - id: existing-tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- dag-runner
    description: Existing DAG runner tests still pass.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement dynamic spawn

## Add to executeDag()

After a node completes successfully, add spawn logic:

```ts
// In executeDag, after successful completion:
if (node.taskDef?.from_seed && opts.spawnChildren) {
  const spawned = await opts.spawnChildren(node, opts.projectDir);
  for (const child of spawned) {
    // child: { id, taskDef, path? }
    const childNode: DagNode = {
      id: child.id,
      parents: [node.id],
      children: [],
      depends_on: [node.id],
      depended_on_by: [],
      taskDef: child.taskDef,
      path: child.path ?? join(dirname(node.path), 'tasks', child.id, 'TASK.md'),
      status: 'pending',
      virtual: false,
    };
    // Update parent
    if (!node.children.includes(child.id)) {
      node.children.push(child.id);
    }
    dag.addNode(childNode);
  }
  // Recompute topological order for remaining layers
  // (or use a dynamic approach: re-check readiness after each node)
}
```

## Update DagRunnerOpts

Add optional spawn hook:
```ts
export interface DagRunnerOpts {
  // ... existing fields
  spawnChildren?: (node: DagNode, projectDir: string) => Promise<SpawnedChild[]>;
}

export interface SpawnedChild {
  id: string;
  taskDef: TaskDefinition;
  path?: string;
}
```

## Integration with child-synthesizer

In the CLI layer (not in dag-runner.ts), wire:
```ts
const opts: DagRunnerOpts = {
  // ...
  spawnChildren: async (node, projectDir) => {
    const synthesizer = createChildSynthesizer(projectDir);
    return synthesizer.synthesize(node);
  },
};
```

## Refactor

Consider making topological order computation lazy — recompute only
when the DAG has changed (new nodes added). This keeps the
single-pass property while supporting dynamic spawns.

Run all tests — green. Run typecheck — no errors.
