---
id: migrate-autonomous-run-green
title: Green — migrate autonomous-run to ExecutionLogger + RunResultsManager
description: |
  Replace all checkpoint and session imports. Tests pass. Typecheck green.

inputs:
  - packages/cli/src/autonomous-run.ts

outputs:
  - packages/cli/src/autonomous-run.ts (modified)

checks:
  - id: no-checkpoint-imports
    cmd: "! grep -q 'CheckpointManager\\|FilesystemTaskStatus' packages/cli/src/autonomous-run.ts"
    description: No checkpoint imports.
  - id: no-session-imports
    cmd: "! grep -q 'SessionLogger' packages/cli/src/autonomous-run.ts"
    description: No session imports.
  - id: typecheck-green
    cmd: pnpm --filter @openplaybooks/converge-cli typecheck
    description: CLI typechecks.

tags:
  - tdd
  - green
---

# Green — migrate autonomous-run.ts

## Step 1: Replace imports

Remove:
```ts
import { CheckpointManager } from "@openplaybooks/converge-core";
import { FilesystemTaskStatus } from "@openplaybooks/converge-core";
import { SessionLogger, generateSessionId } from "@openplaybooks/converge-core";
```

Add:
```ts
import { RunResultsManager } from "@openplaybooks/converge-core";
import { ExecutionLogger, generateExecutionId } from "@openplaybooks/converge-core";
```

## Step 2: Session lifecycle → Execution lifecycle

```ts
// Before:
const sessionId = generateSessionId();
const logger = new SessionLogger(projectDir, sessionId, name, config);

// After:
const executionId = generateExecutionId();
const logger = new ExecutionLogger(projectDir, executionId, name, config);
```

## Step 3: State management → RunResultsManager

```ts
// Before:
const checkpoint = new CheckpointManager(projectDir);
const isLocked = await checkpoint.isTaskLocked(taskId);

// After:
const runResults = new RunResultsManager(executionDir, manifest);
await runResults.init();
const isLocked = await runResults.isLocked(taskId);
```

## Step 4: Resume from previous execution

```ts
// Before: scan checkpoint.json files
const statusMap = checkpoint.getStatusMap();

// After: read previous execution's run_results.json
const prevResults = await readRunResults(prevExecutionDir);
```

## Step 5: Task execution

Pass `runResults` and `executionId` to `executeTask()`.
Pass `executionDir` for task artifact paths.
