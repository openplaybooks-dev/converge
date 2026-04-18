# Journal Tree - Execution History

## Overview

The `JournalTree` loads execution history from the journal (`.converge/journal/`) and provides a parallel tree structure to `TaskTree`:

- **TaskTree**: What to execute (from `.converge/epics/`)
- **JournalTree**: What was executed (from `.converge/journal/`)

## Structure

```
.converge/journal/
├── .checkpoint.json          # Global checkpoint
├── epics/
│   ├── 01-prepare-requirements/
│   │   └── tasks/
│   │       └── 001-gather-idea-generate-ux/
│   │           ├── checkpoint.json    # Task checkpoint with attempts
│   │           ├── README.md
│   │           ├── attempts/
│   │           │   ├── 01/           # First attempt
│   │           │   └── 02/           # Second attempt (success)
│   │           └── logs/
│   └── 02-prepare-designs/
│       └── tasks/
│           ├── 001-breakdown-ux-to-screens/
│           │   ├── checkpoint.json
│           │   └── attempts/
│           │       ├── 01/           # Failed
│           │       ├── 02/           # Failed
│           │       └── 03/           # Success
│           └── ...
└── sessions/                 # Session logs
```

## Checkpoint Format

Each task has a `checkpoint.json` with execution history:

```json
{
  "type": "task",
  "id": "001-implement-design-system",
  "status": "complete",
  "lastUpdated": "2026-04-05T14:29:12.296Z",
  "createdAt": "2026-04-05T14:29:12.217Z",
  "attempts": [
    {
      "attempt": 1,
      "startedAt": "2026-04-05T14:08:01.123Z",
      "completedAt": "2026-04-05T14:08:10.456Z",
      "outcome": "failed",
      "durationMs": 9333
    },
    {
      "attempt": 2,
      "startedAt": "2026-04-05T14:29:12.217Z",
      "completedAt": "2026-04-05T14:29:12.296Z",
      "outcome": "success",
      "durationMs": 79
    }
  ],
  "currentAttempt": 2
}
```

## API Usage

### Load Journal Tree

```typescript
import { JournalTree } from "@converge/core/tree";

const journalTree = await JournalTree.load(projectDir);
```

### Get Statistics

```typescript
const stats = journalTree.getStats();
// {
//   total: 10,
//   completed: 9,
//   failed: 0,
//   running: 1,
//   pending: 0,
//   totalAttempts: 15
// }
```

### Get Tasks with Retries

```typescript
const retriedTasks = journalTree.getTasksWithRetries();
// Returns tasks that had multiple attempts (failures/retries)

for (const task of retriedTasks) {
  console.log(`${task.id}: ${task.attempts.length} attempts`);
  for (const attempt of task.attempts) {
    console.log(`  Attempt ${attempt.attempt}: ${attempt.outcome}`);
  }
}
```

### Get Total Execution Time

```typescript
const totalMs = journalTree.getTotalExecutionTime();
console.log(`Total: ${(totalMs / 1000).toFixed(1)}s`);
```

### Filter by Epic

```typescript
const epicNodes = journalTree.getEpicNodes("03-implement-app");
```

### Get Specific Node

```typescript
const node = journalTree.getNode("001-implement-design-system");
if (node) {
  console.log(`Status: ${node.status}`);
  console.log(`Attempts: ${node.attempts.length}`);
  console.log(`Children: ${node.children.length}`);
}
```

## CLI Usage

View execution history:

```bash
# Show all execution history
converge journal

# Filter to specific epic
converge journal 03-implement-app

# Show only tasks with retries
converge journal --only-retries
```

## Example Output

```
📊 Execution History

Total Tasks: 10
✓ Completed: 9
✗ Failed: 0
⟳ Running: 1
○ Pending: 0
🔁 Total Attempts: 15
⏱  Total Execution Time: 526.7s

📁 Execution Log:

├── 📂 01-prepare-requirements
│   └── ✓  001-gather-idea-generate-ux (2 attempts) [50.4s]
├── 📂 02-prepare-designs
│   ├── ✓  001-breakdown-ux-to-screens (3 attempts) [73.1s]
│   ├── ✓  002-generate-design-system (4 attempts) [210.6s]
│   └── ✓  002-generate-screen-prompts [0.1s] [3/3 done]
└── 📂 03-implement-app
    ├── ✓  001-implement-design-system [0.1s]
    └── ⟳  003-generate-svg-assets [20/24 done]

🔁 Tasks with Retries (3):

  001-gather-idea-generate-ux (2 attempts)
    ✗ Attempt 1: failed (N/A)
    ✓ Attempt 2: success (50.4s)
```

## Key Features

1. **Execution History**: Complete history of all task executions with attempts
2. **Retry Tracking**: Identifies tasks that needed multiple attempts
3. **Timing Data**: Shows execution time per attempt and total
4. **Parent-Child**: Maintains WBS parent-child relationships
5. **Statistics**: Aggregate stats (completed, failed, running, etc.)
6. **Filtering**: Filter by epic, show only retries

## Use Cases

- **Post-Mortem Analysis**: Review what tasks failed and how many retries
- **Performance Metrics**: Total execution time, per-task timing
- **Debugging**: Identify problematic tasks that need multiple attempts
- **Progress Tracking**: See what's been executed vs. what's defined
- **Audit Trail**: Complete history of execution attempts
