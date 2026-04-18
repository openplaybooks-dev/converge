# Session Logging

Session logging provides complete visibility into autonomous converge runs by capturing execution details, progress tracking, and debugging artifacts in a structured format.

## Overview

The session logging system captures complete orchestration runs in a dedicated `.converge/journal/sessions/{session-id}/` directory structure. Each session gets a unique ID and contains:

- **Complete execution timeline** - All events from session start to finish
- **Debugging artifacts** - Searchable logs with timestamps and context
- **Performance metrics** - Duration tracking, iteration counts, convergence analytics
- **Structured events** - Machine-readable JSONL for programmatic analysis

## Directory Structure

Each session creates the following structure:

```
.converge/journal/sessions/{session-id}/
├── session.log          # Human-readable log (like console output)
├── events.jsonl         # Structured event stream
├── metadata.json        # Session config and outcomes
├── progress.jsonl       # Iteration-by-iteration progress snapshots
└── errors/              # Session-level error aggregation
```

### Session ID Format

Session IDs use the format: `{timestamp}-{shortHash}`

Example: `2026-04-03T15-17-00-abc123`

- **Timestamp**: ISO 8601 format with colons replaced by hyphens
- **Short Hash**: 6-character hash for uniqueness

## File Formats

### session.log

Human-readable log file mirroring console output. Includes:

- Session header with configuration
- Iteration boundaries with progress tracking
- Task selection and execution details
- Gap detection and resolution
- Final summary with outcomes

Example:

```
╔════════════════════════════════════════════════════════════╗
║         🤖 Autonomous AI Orchestrator Starting...         ║
╚════════════════════════════════════════════════════════════╝

Session ID: 2026-04-03T15-17-00-abc123
Project: example-mobile-app-generator
Max Iterations: 100
Started: 2026-04-03T15:17:00.555Z

🤖 Starting autonomous run (snap → execute → snap)

────────────────────────────────────────────────────────────
── Iteration 1 ──────────────────────────────────────────────
📍 Progress: 0/7 tasks complete
▶  Next task: 001-gather-idea-generate-ux
   Epic: 01-prepare-requirements
   Attempt #1

============================================================
Running: gather-idea-generate-ux
  Epic: 01-prepare-requirements
  Attempt: 1
============================================================

── Running ────────────────────────────────────────────────

✅ Done in 33s

   ✅ Task converged
```

### events.jsonl

Structured event stream (one JSON object per line). Each event has:

```typescript
{
  "timestamp": "2026-04-03T15:17:00.555Z",
  "eventType": "SESSION_START" | "ITERATION_START" | "TASK_SELECTED" | ...,
  "message": "Optional human-readable message",
  "metadata": {
    // Event-specific metadata
  }
}
```

**Event Types:**

- `SESSION_START` - Session began
- `SESSION_END` - Session finished
- `ITERATION_START` - New iteration cycle begins
- `ITERATION_COMPLETE` - Iteration finishes
- `TASK_SELECTED` - Task picked for execution
- `TASK_ATTEMPT_START` - New attempt begins
- `TASK_ATTEMPT_COMPLETE` - Attempt finishes
- `UPSTREAM_TRIGGERED` - Dependency triggering
- `GAP_DETECTED` - Gap found during execution
- `STRATEGY_ATTEMPTED` - Resolution strategy tried
- `CONVERGENCE_ACHIEVED` - Task converged
- `CONVERGENCE_STALLED` - Task gave up

### metadata.json

Session configuration and final outcomes:

```json
{
  "sessionId": "2026-04-03T15-17-00-abc123",
  "projectName": "example-mobile-app-generator",
  "startTime": "2026-04-03T15:17:00.555Z",
  "endTime": "2026-04-03T15:45:23.123Z",
  "duration": 1702568,
  "status": "complete",
  "config": {
    "maxIterations": 100,
    "maxAttemptsPerTask": 2
  },
  "outcomes": {
    "totalIterations": 9,
    "tasksCompleted": 2,
    "tasksFailed": 5,
    "gapsResolved": 3,
    "convergenceAchieved": false
  },
  "environment": {
    "nodeVersion": "v20.11.0",
    "platform": "darwin"
  }
}
```

**Status values:**

- `running` - Session in progress
- `complete` - All tasks converged successfully
- `stalled` - Hit max iterations or consecutive failures
- `error` - Fatal error occurred

### progress.jsonl

Iteration-by-iteration progress snapshots (one per line):

```json
{
  "iteration": 1,
  "timestamp": "2026-04-03T15:17:00.555Z",
  "tasksComplete": 0,
  "tasksTotal": 7,
  "currentTask": {
    "id": "001-gather-idea-generate-ux",
    "epic": "01-prepare-requirements",
    "attempt": 1,
    "status": "running"
  },
  "gaps": [
    { "type": "output", "task": "001-gather-idea-generate-ux", "count": 1 }
  ]
}
```

## Usage

### Automatic Logging

Session logging is automatically enabled for all autonomous runs:

```bash
pnpm converge run
```

Each run creates a new session in `.converge/journal/sessions/`.

### Finding Sessions

List all sessions:

```bash
ls .converge/journal/sessions/
```

View latest session log:

```bash
tail -f .converge/journal/sessions/$(ls -t .converge/journal/sessions/ | head -1)/session.log
```

### Analyzing Sessions

**Find failed tasks:**

```bash
grep "TASK_ATTEMPT_COMPLETE" .converge/journal/sessions/*/events.jsonl \
  | jq 'select(.metadata.success == false)'
```

**Count iterations per session:**

```bash
jq -s 'length' .converge/journal/sessions/*/progress.jsonl
```

**List all gaps detected:**

```bash
grep "GAP_DETECTED" .converge/journal/sessions/*/events.jsonl \
  | jq -r '.message'
```

**Get session duration:**

```bash
jq '.duration / 1000 | floor' .converge/journal/sessions/*/metadata.json
```

## Programmatic Access

### Using SessionLogger

```typescript
import { SessionLogger, generateSessionId } from "../journal/session-logger.ts";
import type { ProgressSnapshot } from "../journal/session-types.ts";

// Create session logger
const sessionId = generateSessionId();
const logger = new SessionLogger(projectDir, sessionId, "My Project", {
  maxIterations: 100,
  maxAttemptsPerTask: 2,
});

// Start session
await logger.writeSessionStart();

// Log iteration
const snapshot: ProgressSnapshot = {
  iteration: 1,
  timestamp: new Date().toISOString(),
  tasksComplete: 0,
  tasksTotal: 5,
  currentTask: {
    id: "task-001",
    epic: "epic-01",
    attempt: 1,
    status: "running",
  },
  gaps: [],
};
await logger.writeIterationSnapshot(snapshot);

// Log task execution
await logger.logTaskSelected("task-001", "epic-01", 1);
await logger.logTaskAttemptStart("task-001", 1);
// ... execute task ...
await logger.logTaskAttemptComplete("task-001", 1, true, 5000);

// End session
await logger.writeSessionEnd(
  {
    totalIterations: 1,
    tasksCompleted: 1,
    tasksFailed: 0,
    gapsResolved: 0,
    convergenceAchieved: true,
  },
  "complete",
);
```

### Reading Session Data

```typescript
import { readFile } from "node:fs/promises";

// Read metadata
const metadataPath = `${projectDir}/.converge/journal/sessions/${sessionId}/metadata.json`;
const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));

// Read events
const eventsPath = `${projectDir}/.converge/journal/sessions/${sessionId}/events.jsonl`;
const eventsData = await readFile(eventsPath, "utf-8");
const events = eventsData
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

// Read progress snapshots
const progressPath = `${projectDir}/.converge/journal/sessions/${sessionId}/progress.jsonl`;
const progressData = await readFile(progressPath, "utf-8");
const snapshots = progressData
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
```

## Benefits

### 1. Debugging

Session logs provide complete execution history:

- What tasks ran and in what order
- How many attempts each task took
- What gaps were detected
- Why convergence failed

### 2. Auditability

Permanent record of autonomous runs:

- When runs happened
- What changed
- Who/what triggered changes
- Full decision trail

### 3. Analytics

Structured data enables analysis:

- Average task execution time
- Success/failure rates by task
- Gap patterns over time
- Iteration efficiency

### 4. Reproducibility

Session metadata captures enough context to reproduce issues:

- Configuration used
- Environment details
- Task execution order
- Gap resolution strategies

## Best Practices

### 1. Session Retention

Define a retention policy:

```bash
# Keep last 30 days of sessions
find .converge/journal/sessions -type d -mtime +30 -exec rm -rf {} +
```

### 2. Error Aggregation

Sessions automatically aggregate errors to `errors/` directory. Check this first when debugging failures.

### 3. Progress Monitoring

Use `progress.jsonl` to track convergence over time:

```bash
# Plot iteration vs tasks complete
jq -r '[.iteration, .tasksComplete] | @csv' \
  .converge/journal/sessions/*/progress.jsonl
```

### 4. Event Filtering

Use `jq` to filter events by type:

```bash
# Get all convergence events
jq 'select(.eventType | startswith("CONVERGENCE"))' \
  .converge/journal/sessions/*/events.jsonl
```

## Comparison with Task-Level Journals

| Feature         | Session Logging               | Task Journals                                  |
| --------------- | ----------------------------- | ---------------------------------------------- |
| **Scope**       | Entire autonomous run         | Single task execution                          |
| **Location**    | `.converge/journal/sessions/` | `.converge/journal/epics/{epic}/tasks/{task}/` |
| **Granularity** | Iteration-level               | Attempt-level                                  |
| **Purpose**     | Run-level debugging           | Task-level debugging                           |
| **Format**      | JSONL + human log             | YAML + JSONL + markdown                        |

**Use session logs for:**

- Understanding overall run behavior
- Tracking project progress
- Analyzing convergence patterns
- Debugging orchestration issues

**Use task journals for:**

- Debugging specific task failures
- Understanding gap resolution
- Reviewing AI outputs
- Tracking file changes

## Future Enhancements

Planned features (not yet implemented):

- **Session comparison** - Diff between sessions
- **Web UI** - Browse sessions in browser
- **Session replay** - Replay execution
- **Real-time monitoring** - Live session tracking
- **Export** - Send to Datadog, CloudWatch, etc.

## Related Documentation

- [Journal System](./journal-system.md) - Task-level journaling
- [Gap Detection](./gap-detection.md) - How gaps are detected
- [Convergence Loop](./convergence.md) - Orchestration algorithm
