---
id: loader-green
title: Green — implement buildDagFromPlaybook()
description: |
  Implement packages/core/src/config/declarative-loader.ts. BFS walker
  that builds a TaskDag from declarations. Run tests until green.

inputs:
  - packages/core/tests/config/declarative-loader.test.ts
  - packages/core/src/dag/dag-node.ts
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/config/path-registry.ts
  - packages/core/src/config/task-md-definition.ts

outputs:
  - packages/core/src/config/declarative-loader.ts

checks:
  - id: declarative-loader-exists
    cmd: test -s packages/core/src/config/declarative-loader.ts
    description: Module exists.
  - id: tests-pass
    cmd: pnpm --filter @converge core test -- declarative-loader
    description: All tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @converge core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement declarative loader

Create `packages/core/src/config/declarative-loader.ts`.

## Implementation

```ts
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { TaskDag } from '../dag/task-dag.js';
import { PathRegistry } from './path-registry.js';
import { parseTaskMd } from './task-md-definition.js';
import type { DagNode } from '../dag/dag-node.js';
import type { ParsedChild } from './task-definition.js';

export interface LoadError {
  type: 'cycle' | 'missing_child' | 'duplicate_id' | 'parse_error';
  message: string;
  nodeId?: string;
  childId?: string;
  cycle?: string[];
}

function resolveChildPath(
  parentDir: string,
  parentId: string,
  child: ParsedChild
): string {
  if (child.path) {
    return join(dirname(parentDir), child.path);
  }
  return join(parentDir, 'tasks', child.id, 'TASK.md');
}

function readTaskMd(absPath: string): { frontmatter: Record<string, unknown>; body: string } | null {
  if (!existsSync(absPath)) return null;
  const raw = readFileSync(absPath, 'utf-8');
  // Strip frontmatter delimiters, parse YAML
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const frontmatter = parseYaml(match[1]);
  const body = match[2];
  return { frontmatter, body };
}

export function buildDagFromPlaybook(
  playbookDir: string,
  rootTaskIds: string[],
): { dag: TaskDag; registry: PathRegistry; errors: LoadError[] } {
  const dag = new TaskDag();
  const registry = new PathRegistry();
  const errors: LoadError[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Enqueue roots
  for (const id of rootTaskIds) {
    const path = join(playbookDir, 'tasks', id, 'TASK.md');
    registry.register(id, path);
    queue.push(id);
  }

  // BFS
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentPath = registry.resolve(currentId);
    if (!currentPath) {
      errors.push({ type: 'missing_child', message: `Path not registered for: ${currentId}`, nodeId: currentId });
      continue;
    }

    const md = readTaskMd(currentPath);
    if (!md) {
      errors.push({ type: 'missing_child', message: `TASK.md not found at: ${currentPath}`, nodeId: currentId, childId: currentId });
      continue;
    }

    const taskDef = parseTaskMd(md.frontmatter, md.body);
    const parentDir = currentPath; // used for child path resolution

    const node: DagNode = {
      id: currentId,
      parents: [],       // filled as we discover edges
      children: [],
      depends_on: taskDef.dependencies ?? [],
      depended_on_by: [],
      taskDef,
      path: currentPath,
      status: 'pending',
      virtual: false,
    };

    // Process children: declarations
    if (taskDef.children) {
      for (const child of taskDef.children) {
        const childPath = resolveChildPath(parentDir, currentId, child);
        try {
          registry.register(child.id, childPath);
        } catch (e) {
          errors.push({ type: 'duplicate_id', message: (e as Error).message, nodeId: currentId, childId: child.id });
          continue;
        }

        node.children.push(child.id);

        // Add or update child node
        let childNode = dag.nodes.get(child.id);
        if (!childNode) {
          childNode = {
            id: child.id,
            parents: [currentId],
            children: [],
            depends_on: [],
            depended_on_by: [],
            taskDef: null as any, // populated when visited
            path: childPath,
            status: 'pending',
            virtual: false,
          };
          dag.addNode(childNode);
          queue.push(child.id);
        } else {
          if (!childNode.parents.includes(currentId)) {
            childNode.parents.push(currentId);
          }
        }
      }
    }

    // Process from_seed: → virtual nodes
    if (taskDef.from_seed) {
      const virtualId = `${currentId}__seed__${taskDef.from_seed}`;
      const virtualPath = `${currentPath}::seed::${taskDef.from_seed}`;
      registry.register(virtualId, virtualPath);
      node.children.push(virtualId);
      const virtualNode: DagNode = {
        id: virtualId,
        parents: [currentId],
        children: [],
        depends_on: [currentId],
        depended_on_by: [],
        taskDef: null as any,
        path: virtualPath,
        status: 'pending',
        virtual: true,
      };
      dag.addNode(virtualNode);
    }

    // depends_on edges
    for (const depId of node.depends_on) {
      const depNode = dag.nodes.get(depId);
      if (depNode && !depNode.depended_on_by.includes(currentId)) {
        depNode.depended_on_by.push(currentId);
      }
    }

    dag.addNode(node);
  }

  // Cycle detection
  const cycle = detectCycle(dag.nodes);
  if (cycle) {
    errors.push({ type: 'cycle', message: `Cycle detected: ${cycle.join(' → ')}`, cycle });
  }

  return { dag, registry, errors };
}
```

## Step-by-step

1. Create the module file
2. Run unit tests — fix any failures
3. Run typecheck — fix any type errors
4. Refactor: extract `resolveChildPath`, `readTaskMd` as module-level
   helpers; consider extracting virtual node creation
5. All tests green → done

Run `pnpm --filter @converge core test -- declarative-loader` — all green.
Run `pnpm --filter @converge core typecheck` — no errors.
