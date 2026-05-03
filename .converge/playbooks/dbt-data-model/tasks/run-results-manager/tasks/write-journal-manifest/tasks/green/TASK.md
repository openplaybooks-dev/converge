---
id: write-journal-manifest-green
title: Green — implement writeJournalManifest
description: |
  Implement writeJournalManifest(). Writes manifest.json at journal root.
  Run tests — pass. Typecheck green.

inputs:
  - packages/core/src/dag/task-dag.ts
  - packages/core/src/journal/structure.ts

outputs:
  - packages/core/src/manifest/run-results-manager.ts (modified)

checks:
  - id: function-exists
    cmd: grep -q 'writeJournalManifest' packages/core/src/manifest/run-results-manager.ts
    description: writeJournalManifest() exists.
  - id: typecheck-green
    cmd: pnpm --filter @converge/core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement writeJournalManifest

Add to `run-results-manager.ts`:

```ts
import { getExecutionManifestPath } from "../journal/structure.js";

export async function writeJournalManifest(
  projectDir: string,
  dag: TaskDag,
): Promise<void> {
  const manifest = dag.toManifest();
  const manifestPath = getExecutionManifestPath(projectDir);
  const dir = path.dirname(manifestPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await atomicWriteFile(manifestPath, JSON.stringify(manifest, null, 2));
}
```

Also export from `packages/core/src/manifest/index.ts`.
