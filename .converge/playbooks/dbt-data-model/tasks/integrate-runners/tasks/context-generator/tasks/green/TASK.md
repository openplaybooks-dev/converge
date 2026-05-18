---
id: context-generator-green
title: Green — implement context generator
description: |
  Implement generateTaskContexts(). Writes per-task context.json files.
  All tests pass. Typecheck green.

inputs:
  - packages/core/tests/manifest/context-generator.test.ts

outputs:
  - packages/core/src/manifest/context-generator.ts

checks:
  - id: module-exists
    cmd: test -s packages/core/src/manifest/context-generator.ts
    description: Context generator module exists.
  - id: tests-pass
    cmd: pnpm --filter @openplaybooks/converge-core test -- context-generator
    description: Context generator tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement context generator

Create `packages/core/src/manifest/context-generator.ts`:

```ts
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteFile } from "../checkpoint/atomic-write.js";
import { getExecutionTaskDir } from "../journal/structure.js";
import type { Manifest } from "./types.js";

export interface TaskContext {
  id: string;
  parents: string[];
  children: string[];
  depends_on: string[];
  depended_on_by: string[];
  siblings: string[];
  path: string;
  status: string;
}

export async function generateTaskContexts(
  projectDir: string,
  executionId: string,
  manifest: Manifest,
): Promise<void> {
  const nodes = manifest.nodes;
  const childMap = manifest.child_map;
  const parentMap = manifest.parent_map;

  // Compute siblings: nodes sharing at least one parent
  const siblingMap = new Map<string, Set<string>>();
  for (const [id, parents] of Object.entries(parentMap)) {
    for (const parentId of parents) {
      const childrenOfParent = childMap[parentId] ?? [];
      for (const childId of childrenOfParent) {
        if (childId !== id) {
          if (!siblingMap.has(id)) siblingMap.set(id, new Set());
          siblingMap.get(id)!.add(childId);
        }
      }
    }
  }

  for (const [id, node] of Object.entries(nodes)) {
    const context: TaskContext = {
      id,
      parents: parentMap[id] ?? [],
      children: childMap[id] ?? [],
      depends_on: (node as any).depends_on ?? [],
      depended_on_by: (node as any).depended_on_by ?? [],
      siblings: [...(siblingMap.get(id) ?? [])],
      path: (node as any).path ?? "",
      status: (node as any).state ?? "pending",
    };

    const taskDir = getExecutionTaskDir(projectDir, executionId, id);
    if (!existsSync(taskDir)) {
      await mkdir(taskDir, { recursive: true });
    }

    await atomicWriteFile(
      join(taskDir, "context.json"),
      JSON.stringify(context, null, 2),
    );
  }
}
```

Export from `packages/core/src/manifest/index.ts`.

Run `pnpm --filter @openplaybooks/converge-core test -- context-generator` — all tests pass.
