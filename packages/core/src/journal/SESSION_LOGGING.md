# Session Logging System

## Overview

The Converge framework implements a **hierarchical logging system** with three levels:

1. **Session Level** - Orchestration-wide events across all tasks
2. **Task Level** - Per-task aggregated status and outcomes
3. **Attempt Level** - Detailed execution logs for each task attempt

This document describes the **session-level logging** system that captures complete autonomous runs for debugging and inspection.

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Autonomous Run Session                                       │
│ (autonomous-run.ts)                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─→ SessionLogger (session-logger.ts)
                  │   └─→ .converge/journal/sessions/{sessionId}/
                  │       ├── session.log (human-readable)
                  │       ├── events.jsonl (structured events)
                  │       ├── metadata.json (session config + outcomes)
                  │       └── progress.jsonl (iteration snapshots)
                  │
                  ├─→ Task Execution (task-runner.ts)
                  │   │
                  │   ├─→ TaskEventWriter (event-writer.ts)
                  │   │   └─→ .converge/journal/tasks/.../tasks/.../attempts/wip/logs/
                  │   │       └── events.jsonl (task-level events)
                  │   │
                  │   └─→ SessionEventBridge (session-event-bridge.ts)
                  │       └─→ Bridges task events to session logger
                  │
                  └─→ Gap Resolution (repair/pipeline.ts)
                      └─→ Logs strategies to session logger
```

### Directory Structure

```
.converge/journal/
├── sessions/                          ← Session-level logs (NEW!)
│   ├── {sessionId}/                   ← e.g., "2026-04-05T15-17-00-abc123"
│   │   ├── session.log                ← Human-readable session log
│   │   ├── events.jsonl               ← Structured session events (JSONL)
│   │   ├── metadata.json              ← Session config + outcomes
│   │   └── progress.jsonl             ← Iteration snapshots
│   └── latest -> {sessionId}          ← Symlink to most recent session (optional)
│
├── epics/                             ← Task-level hierarchy
│   └── {epic-id}/
│       ├── tasks/
│       │   └── {task-id}/
│       │       ├── attempts/
│       │       │   ├── wip/           ← Current attempt (work in progress)
│       │       │   │   ├── logs/
│       │       │   │   │   ├── events.jsonl  ← Task attempt events
│       │       │   │   │   └── log.log       ← Human-readable task log
│       │       │   │   ├── TASK.md
│       │       │   │   ├── CHECK.md
│       │       │   │   └── NEEDS.md
│       │       │   ├── 01/            ← Archived attempt #1
│       │       │   ├── 02/            ← Archived attempt #2 (if retried)
│       │       │   └── ...
│       │       ├── attempts.jsonl     ← All attempts summary
│       │       ├── checkpoint.json    ← Task status
│       │       └── README.md
│       └── checkpoint.json
└── .checkpoint.json                   ← Global checkpoint
```

---

## Session Files

### 1. `session.log` - Human-Readable Log

**Purpose**: Readable summary of the entire autonomous run

**Format**: Plain text with ASCII art formatting

**Contents**:
- Session start banner with config
- Iteration summaries
- Task selections and outcomes
- Gap detection and resolution
- Final session summary with stats

**Example**:
```
╔════════════════════════════════════════════════════════════╗
║         🤖 Autonomous AI Orchestrator Starting...         ║
╚════════════════════════════════════════════════════════════╝

Session ID: 2026-04-05T15-17-00-abc123
Project: My Mobile App
Max Iterations: 100
Started: 2026-04-05T15:17:00.000Z

🤖 Starting autonomous run (snap → execute → snap)

────────────────────────────────────────────────────────────
── Iteration 1 ─────────────────────────────────────────────
📍 Progress: 0/11 tasks complete
▶  Next task: 001-gather-idea-generate-ux
   Epic: 01-prepare-requirements  Task: 001-gather-idea-generate-ux
   Attempt #1

============================================================
Running: 001-gather-idea-generate-ux
  Path: 001-gather-idea-generate-ux
  Epic: 01-prepare-requirements
  Attempt: 1
============================================================

── Running ────────────────────────────────────────────────

   Gap detected: [task-definition-mismatch] TASK.md not found
   [1] Trying strategy: task-definition-repair

   ✅ Resolved by: task-definition-repair (will rerun task)

✅ Done in 1m 42s

...

============================================================
✅ SESSION COMPLETE
============================================================
Session ID: 2026-04-05T15-17-00-abc123
Duration: 3600s
Iterations: 15
Tasks Completed: 11
Tasks Failed: 0
Gaps Resolved: 23
Convergence: Yes

Session artifacts: .converge/journal/sessions/2026-04-05T15-17-00-abc123
```

---

### 2. `events.jsonl` - Structured Event Stream

**Purpose**: Machine-readable event log for programmatic analysis

**Format**: JSON Lines (one JSON object per line)

**Event Types**:
- `SESSION_START` / `SESSION_END`
- `ITERATION_START` / `ITERATION_COMPLETE`
- `TASK_SELECTED`
- `TASK_ATTEMPT_START` / `TASK_ATTEMPT_COMPLETE`
- `UPSTREAM_TRIGGERED`
- `GAP_DETECTED` / `STRATEGY_ATTEMPTED` / `GAP_RESOLVED`
- `CONVERGENCE_ACHIEVED` / `CONVERGENCE_STALLED`

**Example**:
```jsonl
{"timestamp":"2026-04-05T15:17:00.123Z","eventType":"SESSION_START","message":"Session started","metadata":{"projectName":"My Mobile App","config":{"maxIterations":100,"maxAttemptsPerTask":2}}}
{"timestamp":"2026-04-05T15:17:02.456Z","eventType":"ITERATION_START","message":"Iteration 1 started","metadata":{"iteration":1,"tasksComplete":0,"tasksTotal":11}}
{"timestamp":"2026-04-05T15:17:02.789Z","eventType":"TASK_SELECTED","message":"Task selected: 001-gather-idea-generate-ux","metadata":{"taskId":"001-gather-idea-generate-ux","epicId":"01-prepare-requirements","attempt":1}}
{"timestamp":"2026-04-05T15:17:02.890Z","eventType":"TASK_ATTEMPT_START","message":"Attempt 1 started","metadata":{"taskId":"001-gather-idea-generate-ux","attempt":1}}
{"timestamp":"2026-04-05T15:18:45.123Z","eventType":"GAP_DETECTED","message":"TASK.md not found","metadata":{"taskId":"001-gather-idea-generate-ux","gapType":"task-definition-mismatch"}}
{"timestamp":"2026-04-05T15:18:45.234Z","eventType":"STRATEGY_ATTEMPTED","message":"Strategy: task-definition-repair","metadata":{"taskId":"001-gather-idea-generate-ux","strategy":"task-definition-repair"}}
{"timestamp":"2026-04-05T15:20:30.456Z","eventType":"TASK_ATTEMPT_COMPLETE","message":"Attempt 1 succeeded","metadata":{"taskId":"001-gather-idea-generate-ux","attempt":1,"success":true,"duration":147566}}
{"timestamp":"2026-04-05T15:20:30.567Z","eventType":"CONVERGENCE_ACHIEVED","message":"Task converged","metadata":{"taskId":"001-gather-idea-generate-ux"}}
...
{"timestamp":"2026-04-05T16:17:00.890Z","eventType":"SESSION_END","message":"Session complete","metadata":{"status":"complete","outcomes":{"totalIterations":15,"tasksCompleted":11,"tasksFailed":0,"gapsResolved":23,"convergenceAchieved":true},"duration":3600000}}
```

---

### 3. `metadata.json` - Session Configuration & Outcomes

**Purpose**: Session summary with config and final statistics

**Format**: JSON

**Contents**:
- `sessionId`: Unique session identifier
- `projectName`: Project name from converge.ts
- `startTime` / `endTime`: ISO timestamps
- `duration`: Total session duration in milliseconds
- `status`: `'running' | 'complete' | 'stalled' | 'error'`
- `config`: Session configuration (maxIterations, maxAttemptsPerTask)
- `outcomes`: Final statistics (tasks completed/failed, gaps resolved, convergence)
- `environment`: Node version, platform

**Example**:
```json
{
  "sessionId": "2026-04-05T15-17-00-abc123",
  "projectName": "My Mobile App",
  "startTime": "2026-04-05T15:17:00.000Z",
  "endTime": "2026-04-05T16:17:00.000Z",
  "duration": 3600000,
  "status": "complete",
  "config": {
    "maxIterations": 100,
    "maxAttemptsPerTask": 2
  },
  "outcomes": {
    "totalIterations": 15,
    "tasksCompleted": 11,
    "tasksFailed": 0,
    "gapsResolved": 23,
    "convergenceAchieved": true
  },
  "environment": {
    "nodeVersion": "v20.11.0",
    "platform": "darwin"
  }
}
```

---

### 4. `progress.jsonl` - Iteration Snapshots

**Purpose**: Per-iteration progress tracking

**Format**: JSON Lines

**Contents**: One snapshot per iteration with:
- `iteration`: Iteration number
- `timestamp`: ISO timestamp
- `tasksComplete` / `tasksTotal`: Progress counters
- `currentTask`: Currently executing task info
- `gaps`: Active gaps detected

**Example**:
```jsonl
{"iteration":1,"timestamp":"2026-04-05T15:17:02.456Z","tasksComplete":0,"tasksTotal":11,"currentTask":{"id":"001-gather-idea-generate-ux","epic":"01-prepare-requirements","attempt":1,"status":"running"},"gaps":[]}
{"iteration":2,"timestamp":"2026-04-05T15:20:35.789Z","tasksComplete":1,"tasksTotal":11,"currentTask":{"id":"001-breakdown-ux-to-screens","epic":"02-prepare-designs","attempt":1,"status":"running"},"gaps":[]}
{"iteration":3,"timestamp":"2026-04-05T15:25:10.123Z","tasksComplete":2,"tasksTotal":11,"currentTask":{"id":"002-generate-design-system","epic":"02-prepare-designs","attempt":1,"status":"running"},"gaps":[{"type":"missing-output","task":"001-breakdown-ux-to-screens","count":1}]}
...
```

---

## Event Bridging

The **SessionEventBridge** automatically aggregates task-level events to the session:

### Task → Session Event Mapping

| Task Event (TaskEventWriter) | Session Event (SessionLogger) |
|------------------------------|-------------------------------|
| `gap_detected` | `GAP_DETECTED` |
| `strategy_applied` | `STRATEGY_ATTEMPTED` |
| `gap_resolved` | `GAP_RESOLVED` (with metadata) |
| `tool_use_start` | Logged via `logToolUse()` |
| `ai_reasoning` / `ai_planning` | Logged via `logAiActivity()` |
| `task_complete` / `task_failed` | `TASK_ATTEMPT_COMPLETE` (via task-runner) |

### How It Works

1. **TaskEventWriter** writes events to `.../attempts/wip/logs/events.jsonl`
2. **SessionEventBridge** watches this file for changes
3. Bridge reads new events and calls SessionLogger methods
4. **SessionLogger** writes aggregated events to `sessions/{sessionId}/events.jsonl`

---

## Usage

### Automatic (Autonomous Run)

Session logging is **automatically enabled** when using `pnpm converge run`:

```bash
cd your-project
pnpm converge run  # Session logs created in .converge/journal/sessions/
```

### Viewing Session Logs

**Human-readable log**:
```bash
# View the latest session log
tail -f .converge/journal/sessions/latest/session.log

# Or specific session
cat .converge/journal/sessions/2026-04-05T15-17-00-abc123/session.log
```

**Structured events (JSONL)**:
```bash
# Stream events as they happen
tail -f .converge/journal/sessions/latest/events.jsonl | jq .

# Filter specific event types
cat .converge/journal/sessions/latest/events.jsonl | jq 'select(.eventType == "GAP_DETECTED")'

# Count gap resolutions by strategy
cat .converge/journal/sessions/latest/events.jsonl \
  | jq 'select(.eventType == "STRATEGY_ATTEMPTED") | .metadata.strategy' \
  | sort | uniq -c
```

**Session metadata**:
```bash
cat .converge/journal/sessions/latest/metadata.json | jq .
```

**Progress over time**:
```bash
cat .converge/journal/sessions/latest/progress.jsonl | jq .tasksComplete
```

---

## Debugging with Session Logs

### Common Debugging Scenarios

#### 1. Why did a task fail?

```bash
# Find all gaps detected for a specific task
cat .converge/journal/sessions/latest/events.jsonl \
  | jq 'select(.eventType == "GAP_DETECTED" and .metadata.taskId == "001-my-task")'
```

#### 2. Which strategies were tried?

```bash
# List all strategy attempts
cat .converge/journal/sessions/latest/events.jsonl \
  | jq 'select(.eventType == "STRATEGY_ATTEMPTED") | "\(.timestamp): \(.metadata.strategy) for \(.metadata.taskId)"'
```

#### 3. How long did each task take?

```bash
# Extract task durations
cat .converge/journal/sessions/latest/events.jsonl \
  | jq 'select(.eventType == "TASK_ATTEMPT_COMPLETE") | {task: .metadata.taskId, duration: .metadata.duration, success: .metadata.success}'
```

#### 4. What tools/commands were used?

```bash
# List all tool invocations
cat .converge/journal/sessions/latest/events.jsonl \
  | jq 'select(.metadata.toolName) | {tool: .metadata.toolName, params: .metadata.params}'
```

#### 5. Session performance summary

```bash
cat .converge/journal/sessions/latest/metadata.json | jq '{
  duration_minutes: (.duration / 60000),
  iterations: .outcomes.totalIterations,
  tasks_completed: .outcomes.tasksCompleted,
  tasks_failed: .outcomes.tasksFailed,
  gaps_resolved: .outcomes.gapsResolved,
  success: .outcomes.convergenceAchieved
}'
```

---

## Integration Points

### In `autonomous-run.ts`

```typescript
import { SessionLogger, generateSessionId } from '../journal/session-logger.ts';

const sessionId = generateSessionId();
const sessionLogger = new SessionLogger(projectDir, sessionId, projectName, config);

// Session lifecycle
await sessionLogger.writeSessionStart();
await sessionLogger.writeIterationSnapshot(snapshot);
await sessionLogger.logTaskSelected(taskId, epicId, attempt);
await sessionLogger.logTaskAttemptStart(taskId, attempt);
await sessionLogger.logTaskAttemptComplete(taskId, attempt, success, duration);
await sessionLogger.writeSessionEnd(outcomes, status);
```

### In `task-runner.ts`

```typescript
import { SessionEventBridge } from '../journal/session-event-bridge.ts';

// Pass session logger to task execution context
const execResult = await executeTask(
  {
    projectDir,
    epicId,
    journalTaskId,
    filePath,
    isSkillMd,
    sessionLogger, // ← Session logger for event bridging
  },
  checkpointMgr,
);

// Inside executeTask:
const sessionBridge = new SessionEventBridge(ctx.sessionLogger);
await sessionBridge.monitorTaskEvents(ctx.journalTaskId, eventsFile);
```

### In `repair/pipeline.ts`

```typescript
// Get session logger from global context
const sessionLogger = getSessionLogger();

// Log gap detection and strategy attempts
if (sessionLogger && journalCtx.taskId) {
  await sessionLogger.logGapDetected(journalCtx.taskId, gapType, description);
  await sessionLogger.logStrategyAttempted(journalCtx.taskId, strategy.name);
}
```

---

## Benefits

### 1. **Complete Audit Trail**
- Every session is fully logged with structured data
- Trace back any issue to exact iteration, task, and attempt
- Understand what the AI agent did and why

### 2. **Performance Analysis**
- Measure task durations across sessions
- Identify slow tasks or bottlenecks
- Track convergence speed improvements

### 3. **Gap Pattern Detection**
- Analyze which gaps occur most frequently
- Identify which strategies are most effective
- Improve gap resolution pipeline

### 4. **Cross-Task Analysis**
- See dependencies and upstream triggers
- Understand task ordering and parallelization
- Optimize task scheduling

### 5. **Debugging & Inspection**
- Rich context for debugging failures
- Replay session events to understand behavior
- Compare successful vs. failed sessions

---

## Future Enhancements

- **Session diff tool**: Compare two sessions side-by-side
- **Session replay**: Re-run a session from events.jsonl
- **Performance dashboard**: Visualize session metrics
- **Gap analytics**: Aggregate gap patterns across sessions
- **Session hooks**: Custom callbacks on session events
- **Session tagging**: Add custom metadata to sessions

---

## Related Files

- `session-logger.ts` - Core SessionLogger class
- `session-types.ts` - TypeScript types for session logging
- `session-event-bridge.ts` - Bridges task events to session
- `autonomous-run.ts` - Orchestrator that creates sessions
- `task-runner.ts` - Task execution with session integration
- `event-writer.ts` - Task-level event writer
- `repair/pipeline.ts` - Gap resolution with session logging
