---
id: run-results-manager-impl-green
title: Green — implement RunResultsManager
description: |
  Implement RunResultsManager class. Run tests — all must pass (GREEN).

inputs:
  - packages/core/tests/manifest/run-results-manager.test.ts

outputs:
  - packages/core/src/manifest/run-results-manager.ts

checks:
  - id: module-exists
    cmd: test -s packages/core/src/manifest/run-results-manager.ts
    description: RunResultsManager module exists.
  - id: tests-pass
    cmd: pnpm --filter @converge/core test -- run-results-manager
    description: RunResultsManager tests pass (GREEN).
  - id: typecheck-green
    cmd: pnpm --filter @converge/core typecheck
    description: Core typechecks.

tags:
  - tdd
  - green
---

# Green — implement RunResultsManager

Create `packages/core/src/manifest/run-results-manager.ts`:

```ts
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteFile } from "../checkpoint/atomic-write.js";
import type { Manifest, RunResult, RunResults } from "./types.js";

export class RunResultsManager {
  private filePath: string;
  private manifest: Manifest;

  constructor(executionDir: string, manifest: Manifest) {
    this.filePath = join(executionDir, "run_results.json");
    this.manifest = manifest;
  }

  async init(): Promise<void> {
    // Create execution dir if needed
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    // Initialize run_results.json with all nodes pending
    const results: RunResult[] = Object.keys(this.manifest.nodes).map(id => ({
      id,
      status: "pending" as const,
      attempts: 0,
      duration_ms: 0,
    }));
    const runResults: RunResults = {
      metadata: {
        execution_id: path.basename(path.dirname(this.filePath)),
        playbook: this.manifest.metadata.playbook,
        manifest_hash: "",
        selector: "",
        status: "running",
      },
      results,
    };
    await atomicWriteFile(this.filePath, JSON.stringify(runResults, null, 2));
  }

  async load(): Promise<RunResults> {
    const content = await readFile(this.filePath, "utf-8");
    return JSON.parse(content);
  }

  async save(runResults: RunResults): Promise<void> {
    await atomicWriteFile(this.filePath, JSON.stringify(runResults, null, 2));
  }

  // ... mutations and queries
}
```

Key implementation details:
- `markRunning(id)`: load, find node, set status=running, increment attempts, save, return attempt #
- `markComplete(id, duration)`: load, find node, set status=pass, set duration_ms, set completed_at
- `markFailed(id, error, duration)`: load, find node, set status=error, set error_message, set duration_ms
- `markSkipped(id)`: load, find node, set status=skipped
- `isLocked(id)`: status is complete, failed, OR skipped
- `isComplete(id)`: status === "pass"
- `isFailed(id)`: status === "error"
- `getNodeStatus(id)`: return the RunResult or undefined
- `getAttemptCount(id)`: return node's attempts count
- `getCompletedCount()`: count nodes with status "pass"
- `getFailedCount()`: count nodes with status "error"
- `getResultsSnapshot()`: return current RunResults

All writes go through `save()` which uses atomic write. All reads parse the JSON.
No caching needed initially — the file is small enough for O(1) reads.

Run `pnpm --filter @converge/core test -- run-results-manager` — all tests pass.
