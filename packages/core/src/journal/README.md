# Journal System

Simple journal system for AI self-planning and gap tracking across execution contexts.

## Overview

The journal system provides automatic tracking of gaps and events at project/epic/task levels, enabling AI agents to:

- Track current gaps without re-running all checks
- Review execution history and error patterns
- Self-plan across different execution contexts
- Learn from past failures and decisions

## File Structure

```
.converge/journal/
├── project.gaps.yml              # Current project gaps (YAML)
├── project.events.jsonl          # Project events (JSONL)
├── project.log.log               # Human-readable project log
├── 01-api.gaps.yml               # Epic gaps
├── 01-api.events.jsonl           # Epic events
├── 01-api.log.log                # Epic log
├── 01-api.setup-db.gaps.yml      # Task gaps
├── 01-api.setup-db.events.jsonl  # Task events
└── 01-api.setup-db.log.log       # Task log
```

### File Naming Convention

- **Project level**: `project.{type}.{ext}`
- **Epic level**: `{epic-id}.{type}.{ext}`
- **Task level**: `{epic-id}.{task-id}.{type}.{ext}`

### File Types

- **`gaps.yml`**: Current gaps in YAML format (structured, easy to read)
- **`events.jsonl`**: Event log in JSONL format (one JSON object per line, easy to parse)
- **`log.log`**: Human-readable log (plain text with timestamps)
- **`summary.yml`**: Metadata and summaries (YAML)

## File Formats

### Gaps File (`*.gaps.yml`)

```yaml
total: 2
byType:
  structural: 1
  semantic: 1
bySeverity:
  high: 1
  medium: 1
updated: "2025-01-15T12:30:00.000Z"
gaps:
  - id: gap-001
    type: structural
    level: task
    scope: 01-api.setup-db
    description: Database config missing
    detected: "2025-01-15T10:00:00.000Z"
    resolved: false
    checks:
      - check-db-config
    severity: high
  - id: gap-002
    type: semantic
    level: task
    scope: 01-api.setup-db
    description: API errors not handled
    detected: "2025-01-15T10:05:00.000Z"
    resolved: false
    checks:
      - check-error-handling
    severity: medium
```

### Events File (`*.events.jsonl`)

```jsonl
{"timestamp":"2025-01-15T10:00:00.000Z","eventType":"SESSION_START","level":"task","scope":"01-api.setup-db"}
{"timestamp":"2025-01-15T10:05:00.000Z","eventType":"GAP_DETECTED","level":"task","scope":"01-api.setup-db","message":"Database config missing","metadata":{"gapId":"gap-001"}}
{"timestamp":"2025-01-15T10:10:00.000Z","eventType":"TASK_START","level":"task","scope":"01-api.setup-db","message":"Starting task: Setup database","metadata":{"taskType":"shell","attempt":1}}
{"timestamp":"2025-01-15T10:15:00.000Z","eventType":"ERROR","level":"task","scope":"01-api.setup-db","message":"ConnectionTimeout: DB not accessible"}
{"timestamp":"2025-01-15T10:20:00.000Z","eventType":"TASK_FAILED","level":"task","scope":"01-api.setup-db","message":"Task failed: Connection timeout"}
{"timestamp":"2025-01-15T10:25:00.000Z","eventType":"DECISION","level":"task","scope":"01-api.setup-db","message":"Switch to Docker for PostgreSQL"}
{"timestamp":"2025-01-15T10:30:00.000Z","eventType":"TASK_START","level":"task","scope":"01-api.setup-db","message":"Starting task: Setup database","metadata":{"attempt":2}}
{"timestamp":"2025-01-15T10:35:00.000Z","eventType":"TASK_COMPLETE","level":"task","scope":"01-api.setup-db","message":"Task completed successfully"}
{"timestamp":"2025-01-15T10:36:00.000Z","eventType":"GAP_RESOLVED","level":"task","scope":"01-api.setup-db","message":"Gap resolved: Database config missing","metadata":{"gapId":"gap-001"}}
```

### Log File (`*.log.log`)

```
[2025-01-15T10:00:00.000Z] [SESSION_START]
[2025-01-15T10:05:00.000Z] [GAP_DETECTED] Database config missing
[2025-01-15T10:10:00.000Z] [TASK_START] Starting task: Setup database
[2025-01-15T10:15:00.000Z] [ERROR] ConnectionTimeout: DB not accessible
[2025-01-15T10:20:00.000Z] [TASK_FAILED] Task failed: Connection timeout
[2025-01-15T10:25:00.000Z] [DECISION] Switch to Docker for PostgreSQL
[2025-01-15T10:30:00.000Z] [TASK_START] Starting task: Setup database
[2025-01-15T10:35:00.000Z] [TASK_COMPLETE] Task completed successfully
[2025-01-15T10:36:00.000Z] [GAP_RESOLVED] Gap resolved: Database config missing
```

## Event Types

```typescript
type EventType =
  | "SESSION_START"
  | "SESSION_END"
  | "GAP_DETECTED"
  | "GAP_RESOLVED"
  | "TASK_START"
  | "TASK_COMPLETE"
  | "TASK_FAILED"
  | "EPIC_START"
  | "EPIC_COMPLETE"
  | "EPIC_FAILED"
  | "PROJECT_START"
  | "PROJECT_COMPLETE"
  | "ERROR"
  | "DECISION"
  | "RETRY"
  | "CHECK_RUN"
  | "CHECK_FAILED";
```

## Automatic Re-Evaluation

The journal system automatically re-evaluates gaps when tasks/epics complete:

### After Task Completion

```typescript
async function onTaskComplete(ctx: TaskContext) {
  // 1. Re-detect task gaps → write {epic}.{task}.gaps.yml
  const taskGaps = await detectTaskGaps(ctx);
  await writeGaps(projectDir, "task", scope, taskGaps);

  // 2. Re-detect epic gaps → write {epic}.gaps.yml
  const epicGaps = await detectEpicGaps(ctx.epic);
  await writeGaps(projectDir, "epic", epicId, epicGaps);

  // 3. If epic complete → re-detect project gaps → write project.gaps.yml
  if (epicGaps.length === 0) {
    const projectGaps = await detectProjectGaps(ctx.project);
    await writeGaps(projectDir, "project", "project", projectGaps);
  }
}
```

### After Epic Completion

```typescript
async function onEpicComplete(ctx: ProjectContext, epicId: string) {
  // 1. Clear epic gaps
  await writeGaps(projectDir, "epic", epicId, []);

  // 2. Re-detect project gaps
  const projectGaps = await detectProjectGaps(ctx);
  await writeGaps(projectDir, "project", "project", projectGaps);
}
```

## Journal API

The journal API is available in all contexts (task/epic/project):

### Reading Gaps

```typescript
// Get current gaps (from gaps.yml)
const gaps = await ctx.journal.getGaps();
console.log(`Current gaps: ${gaps.length}`);

// Get lightweight summary (without full gap details)
const summary = await ctx.journal.getSummary();
console.log(`Total: ${summary.total}`);
console.log(`By type:`, summary.byType);
console.log(`By severity:`, summary.bySeverity);
```

### Reading Events

```typescript
// Get recent events (default: last 20)
const events = await ctx.journal.getRecentEvents(10);

// Find all errors
const errors = await ctx.journal.findErrors();

// Search by pattern
const connectionErrors = await ctx.journal.searchLog({
  eventType: "ERROR",
  pattern: /connection/i,
  limit: 10,
});

// Read with filters
const recentErrors = await ctx.journal.readLog({
  eventType: ["ERROR", "TASK_FAILED"],
  last: 5,
});
```

## AI Usage Patterns

### Before Starting Work

```typescript
// Quick check: how many gaps?
const summary = await ctx.journal.getSummary();
if (summary.total > 0) {
  console.log(`Found ${summary.total} gaps`);

  // Load full gaps if needed
  const gaps = await ctx.journal.getGaps();
  console.log(
    "Gaps:",
    gaps.map((g) => g.description),
  );
}

// Check for recent errors
const errors = await ctx.journal.findErrors();
if (errors.length > 0) {
  console.log("Recent errors:", errors[0].message);
}
```

### During Debugging

```typescript
// Find when error first occurred
const events = await ctx.journal.getRecentEvents(20);
const firstError = events.find((e) => e.eventType === "ERROR");
console.log("First error:", firstError?.message);

// Check if this error pattern happened before
const connectionErrors = await ctx.journal.searchLog({
  eventType: "ERROR",
  pattern: /ConnectionTimeout/,
});

if (connectionErrors.length > 2) {
  console.log("Recurring connection timeout pattern detected");
  console.log("Previous occurrences:", connectionErrors.length);
}
```

### Progressive Disclosure

```typescript
// Level 1: Summary only (lightweight)
const summary = await ctx.journal.getSummary();
console.log(`Total gaps: ${summary.total}`);

// Level 2: Load full gaps (if needed)
if (summary.total > 0 && summary.bySeverity.critical > 0) {
  const gaps = await ctx.journal.getGaps();
  const criticalGaps = gaps.filter((g) => g.severity === "critical");
  console.log("Critical gaps:", criticalGaps);
}

// Level 3: Load history (if debugging)
if (criticalGaps.some((g) => g.type === "structural")) {
  const events = await ctx.journal.readLog({ eventType: "ERROR" });
  console.log("Error history:", events);
}
```

## Writer API

### Writing Gaps

```typescript
import { writeGaps } from "./journal/writer.ts";

// Write gaps to gaps.yml
await writeGaps(projectDir, "task", "01-api.setup-db", gaps);
```

### Logging Events

```typescript
import {
  logTaskEvent,
  logEpicEvent,
  logProjectEvent,
} from "./journal/writer.ts";

// Log task events
await logTaskEvent(
  projectDir,
  epicId,
  taskId,
  "TASK_START",
  "Starting database setup",
  { attempt: 1 },
);

// Log epic events
await logEpicEvent(projectDir, epicId, "EPIC_COMPLETE", "All tasks completed");

// Log project events
await logProjectEvent(projectDir, "PROJECT_START", "Starting new project");
```

### Manual Logging

```typescript
import { appendEvent, appendLog } from "./journal/writer.ts";

// Append to JSONL events file
await appendEvent(
  projectDir,
  "task",
  "01-api.setup-db",
  "DECISION",
  "Switching to PostgreSQL",
  { reason: "Better performance" },
);

// Append to human-readable log
await appendLog(
  projectDir,
  "task",
  "01-api.setup-db",
  "Decision: Switching to PostgreSQL for better performance",
);
```

## Integration with Executor

The executor automatically logs events:

```typescript
class FunctionExecutor {
  async execute(ctx: TaskContext, config: TaskConfig) {
    // Log task start
    await logTaskEvent(
      projectDir,
      epicId,
      taskId,
      "TASK_START",
      "Starting task",
    );

    try {
      const result = await executeTask(ctx, config);

      if (result.success) {
        // Log completion
        await logTaskEvent(
          projectDir,
          epicId,
          taskId,
          "TASK_COMPLETE",
          "Task completed",
        );

        // Trigger automatic re-evaluation
        await reEvaluateAfterTask(ctx);
      } else {
        // Log failure
        await logTaskEvent(
          projectDir,
          epicId,
          taskId,
          "TASK_FAILED",
          result.message,
        );
      }
    } catch (error) {
      // Log error
      await logTaskEvent(projectDir, epicId, taskId, "ERROR", error.message);
    }
  }
}
```

## Benefits

1. **No Re-Running Checks**: AI can read current gaps directly from `gaps.yml`
2. **Error Pattern Detection**: AI can search logs for recurring issues
3. **Progressive Disclosure**: Load summary first, then details if needed
4. **Human-Readable**: Plain text logs for easy debugging
5. **Machine-Parseable**: JSONL events for programmatic access
6. **Automatic**: No manual intervention needed
7. **Lightweight**: Only write when gaps change

## Testing

Run tests:

```bash
cd packages/core
npm test -- journal
```

Test files:

- `tests/unit/journal/journal-writer.test.ts`
- `tests/unit/journal/journal-api.test.ts`
