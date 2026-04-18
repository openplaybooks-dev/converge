# File-First Logging Architecture

## Principle: Files Are Source of Truth

**Core Concept**: ALL events are written to structured JSONL files FIRST. Console output is derived by READING and FORMATTING these files.

```
Event → Journal File (JSONL) → Console Formatter → User Display
         ↑ SOURCE OF TRUTH       ↑ VIEW LAYER
```

## Why File-First?

1. **Single Source of Truth**: Event files are the canonical record
2. **Reproducible**: Can replay console output from event files
3. **Multiple Views**: Different formatters can read same events
4. **Persistence**: Events survive crashes, can be analyzed later
5. **Streaming**: Console can tail event file for real-time updates
6. **Separation**: Event capture is decoupled from presentation

## Architecture

### 1. Event Journal (Write-Only)

```typescript
// Location: .converge/journal/epics/{epicId}/tasks/{taskId}/attempts/{attempt}/events.jsonl

// Each line is a complete event (append-only)
{"timestamp":"2026-04-04T15:27:13.576Z","type":"TASK_START","taskId":"003-001-design-home-lesson-tree","data":{...}}
{"timestamp":"2026-04-04T15:27:14.123Z","type":"TOOL_USE_START","toolName":"Read","params":{"file":".stitch/prompts/home-lesson-tree.md"}}
{"timestamp":"2026-04-04T15:27:14.876Z","type":"TOOL_USE_COMPLETE","toolName":"Read","success":true,"result":{"size":4234,"lines":150}}
{"timestamp":"2026-04-04T15:27:18.234Z","type":"AI_REASONING","text":"Analyzing design requirements for mobile-first zigzag lesson tree"}
{"timestamp":"2026-04-04T15:28:42.567Z","type":"TOOL_USE_START","toolName":"Skill","params":{"skill":"stitch-generate","args":"home-lesson-tree"}}
{"timestamp":"2026-04-04T15:30:15.890Z","type":"TOOL_USE_COMPLETE","toolName":"Skill","success":true,"result":{"output":"Generated HTML"}}
{"timestamp":"2026-04-04T15:30:16.234Z","type":"FILE_CREATED","path":".stitch/designs/home-lesson-tree.html","size":43234,"lines":847}
{"timestamp":"2026-04-04T15:30:16.567Z","type":"VALIDATION_RESULT","output":".stitch/designs/home-lesson-tree.html","exists":true,"passed":true}
{"timestamp":"2026-04-04T15:30:16.890Z","type":"TASK_COMPLETE","duration":183314,"outputs":[".stitch/designs/home-lesson-tree.html"]}
```

### 2. Console Formatter (Read-Only)

```typescript
// Reads events.jsonl and formats for console display
class ConsoleFormatter {
  private eventStream: fs.ReadStream;
  private lastPosition: number = 0;

  async start(eventsFile: string): Promise<void> {
    // Tail the events file
    this.eventStream = fs.createReadStream(eventsFile, {
      encoding: "utf8",
      start: this.lastPosition,
    });

    // Watch for new lines
    this.eventStream.on("data", (chunk) => {
      const lines = chunk.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const event = JSON.parse(line);
        this.formatAndLog(event);
      }
      this.lastPosition = this.eventStream.bytesRead;
    });

    // Watch file for new appends
    fs.watch(eventsFile, (eventType) => {
      if (eventType === "change") {
        this.resumeReading();
      }
    });
  }

  formatAndLog(event: TaskEvent): void {
    const formatted = this.format(event);
    if (formatted) {
      console.log(formatted);
    }
  }

  format(event: TaskEvent): string | null {
    switch (event.type) {
      case "TASK_START":
        return this.formatTaskStart(event);

      case "TOOL_USE_COMPLETE":
        return this.formatToolComplete(event);

      case "AI_REASONING":
        return this.formatReasoning(event);

      case "VALIDATION_RESULT":
        return this.formatValidation(event);

      case "TASK_COMPLETE":
        return this.formatTaskComplete(event);

      // Internal events - don't show on console
      case "STREAM_CHUNK":
      case "INTERNAL_STATE":
        return null;

      default:
        return null;
    }
  }

  formatToolComplete(event: ToolUseCompleteEvent): string {
    const icon = event.success ? "✅" : "❌";
    const tool = this.getToolIcon(event.toolName);

    if (event.toolName === "Read") {
      return `${tool} Read ${event.params.file} (${this.formatSize(event.result.size)})`;
    }

    if (event.toolName === "Write") {
      return `✍️  Write ${event.params.file} (${this.formatSize(event.result.size)}, ${event.result.lines} lines)`;
    }

    if (event.toolName === "Skill") {
      return `🛠️  Skill: ${event.params.skill} → ${event.result.output}`;
    }

    return `${icon} ${event.toolName} ${event.success ? "completed" : "failed"}`;
  }
}
```

### 3. Event Writer (Core)

```typescript
// Centralized event writer - ONLY place that writes to journal
class TaskEventWriter {
  private eventsFile: string;
  private writeStream: fs.WriteStream;
  private eventBuffer: TaskEvent[] = [];
  private flushTimer: NodeJS.Timeout;

  constructor(journalDir: string, taskId: string, attempt: number) {
    this.eventsFile = path.join(
      journalDir,
      "epics",
      extractEpicId(taskId),
      "tasks",
      taskId,
      "attempts",
      String(attempt).padStart(2, "0"),
      "events.jsonl",
    );

    // Ensure directory exists
    fs.mkdirSync(path.dirname(this.eventsFile), { recursive: true });

    // Open append stream
    this.writeStream = fs.createWriteStream(this.eventsFile, { flags: "a" });
  }

  // Write event to file (buffered for performance)
  write(event: TaskEvent): void {
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // Add to buffer
    this.eventBuffer.push(event);

    // Flush after 100ms or when buffer full
    clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 100);

    if (this.eventBuffer.length >= 10) {
      this.flush();
    }
  }

  // Flush buffer to disk
  private flush(): void {
    if (this.eventBuffer.length === 0) return;

    for (const event of this.eventBuffer) {
      const line = JSON.stringify(event) + "\n";
      this.writeStream.write(line);
    }

    this.eventBuffer = [];
  }

  // Close stream (called on task completion)
  close(): void {
    this.flush();
    this.writeStream.end();
  }
}
```

## Event Flow

### Scenario: AI Task Execution

```typescript
// 1. Task starts - write to journal
eventWriter.write({
  type: "TASK_START",
  taskId: "003-001-design-home-lesson-tree",
  taskName: "Generate Design: Home Lesson Tree",
  attempt: 1,
  inputs: [".stitch/prompts/home-lesson-tree.md", ".stitch/DESIGN.md"],
  outputs: [".stitch/designs/home-lesson-tree.html"],
});

// Console formatter reads → displays:
// ┌─ 🎨 Generate Design: Home Lesson Tree ──────────────────────┐
// │ Attempt #1 │ Inputs: 2✓ │ Outputs: 1✗                      │
// └─────────────────────────────────────────────────────────────┘

// 2. AI uses Read tool - write to journal
eventWriter.write({
  type: "TOOL_USE_START",
  toolName: "Read",
  params: {
    file: ".stitch/prompts/home-lesson-tree.md",
  },
});

eventWriter.write({
  type: "TOOL_USE_COMPLETE",
  toolName: "Read",
  success: true,
  result: {
    size: 4234,
    lines: 150,
  },
});

// Console formatter reads → displays:
// 📖 Read .stitch/prompts/home-lesson-tree.md (4.2 KB)

// 3. AI reasoning - write to journal
eventWriter.write({
  type: "AI_REASONING",
  text: "Analyzing design requirements for mobile-first zigzag lesson tree",
  context: {
    screenType: "home-lesson-tree",
    deviceTarget: "mobile-first",
    keyComponents: ["header", "lesson-nodes", "navigation"],
  },
});

// Console formatter reads → displays:
// 💭 Analyzing: Mobile-first zigzag lesson tree
//    └─ Components: header, lesson-nodes, navigation

// 4. File created - write to journal
eventWriter.write({
  type: "FILE_CREATED",
  path: ".stitch/designs/home-lesson-tree.html",
  size: 43234,
  lines: 847,
  verified: true,
});

// Console formatter reads → displays:
// ✍️  Write .stitch/designs/home-lesson-tree.html (42.3 KB, 847 lines)

// 5. Validation - write to journal
eventWriter.write({
  type: "VALIDATION_RESULT",
  output: ".stitch/designs/home-lesson-tree.html",
  exists: true,
  size: 43234,
  checks: [{ id: "design-exists", passed: true }],
});

// Console formatter reads → displays:
// ✅ Validation passed
//    └─ Output: .stitch/designs/home-lesson-tree.html ✓
//    └─ Check: design-exists ✓

// 6. Task complete - write to journal
eventWriter.write({
  type: "TASK_COMPLETE",
  duration: 171234,
  outputs: [".stitch/designs/home-lesson-tree.html"],
  success: true,
});

// Console formatter reads → displays:
// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ ✅ COMPLETED in 2m 51s                                      ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Benefits

### 1. Separation of Concerns

```
┌─────────────────┐
│  Event Source   │ (AI agent, file system, validators)
└────────┬────────┘
         │ write event
         ↓
┌─────────────────┐
│  Event Writer   │ (append to events.jsonl)
└────────┬────────┘
         │ file grows
         ↓
┌─────────────────┐
│  Event File     │ (SOURCE OF TRUTH)
└────────┬────────┘
         │ read + tail
         ↓
┌─────────────────┐
│ Console Format  │ (format for human display)
└────────┬────────┘
         │ log formatted
         ↓
┌─────────────────┐
│    Console      │ (user sees progress)
└─────────────────┘
```

### 2. Multiple Consumers

```typescript
// Same event file, different views

// 1. Real-time console
const consoleFormatter = new ConsoleFormatter();
consoleFormatter.tail(eventsFile);

// 2. Debug logger (verbose)
const debugFormatter = new DebugFormatter();
debugFormatter.tail(eventsFile);

// 3. Progress analyzer
const analyzer = new ProgressAnalyzer();
analyzer.tail(eventsFile);

// 4. Web dashboard (future)
const webSocket = new WebSocketStreamer();
webSocket.streamEvents(eventsFile);
```

### 3. Replay Capability

```typescript
// Replay console output from historical events
async function replayConsole(eventsFile: string): Promise<void> {
  const formatter = new ConsoleFormatter();

  const events = fs
    .readFileSync(eventsFile, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

  for (const event of events) {
    formatter.formatAndLog(event);
    // Optional: delay to simulate real-time
    await sleep(50);
  }
}

// Usage: Replay previous run
await replayConsole(
  ".converge/journal/epics/02-prepare-designs/tasks/003-001.../attempts/01/events.jsonl",
);
```

### 4. Analysis & Debugging

```typescript
// Analyze event patterns
class EventAnalyzer {
  analyze(eventsFile: string): TaskAnalysis {
    const events = this.loadEvents(eventsFile);

    return {
      totalDuration: this.calculateDuration(events),
      toolUsage: this.analyzeToolUsage(events),
      retryPattern: this.detectRetryPattern(events),
      bottlenecks: this.findBottlenecks(events),
      failurePoints: this.identifyFailures(events),
    };
  }

  analyzeToolUsage(events: TaskEvent[]): ToolStats {
    const toolEvents = events.filter((e) => e.type === "TOOL_USE_COMPLETE");

    return {
      totalCalls: toolEvents.length,
      byTool: this.groupBy(toolEvents, "toolName"),
      avgDuration: this.average(toolEvents.map((e) => e.duration)),
      successRate: this.calculateSuccessRate(toolEvents),
    };
  }

  detectRetryPattern(events: TaskEvent[]): RetryAnalysis {
    const attempts = this.groupByAttempt(events);

    if (attempts.length === 1) {
      return { hasRetries: false };
    }

    // Compare attempts to find what changed
    const differences = [];
    for (let i = 1; i < attempts.length; i++) {
      differences.push({
        attemptNumber: i + 1,
        changes: this.diffAttempts(attempts[i - 1], attempts[i]),
        outcome: this.getOutcome(attempts[i]),
      });
    }

    return {
      hasRetries: true,
      totalAttempts: attempts.length,
      pattern: this.identifyPattern(differences),
      resolution: differences.find((d) => d.outcome === "success"),
    };
  }
}
```

## Implementation

### Directory Structure

```
.converge/journal/
├── epics/
│   └── 02-prepare-designs/
│       └── tasks/
│           └── 003-001-design-home-lesson-tree/
│               ├── attempts/
│               │   ├── 01/
│               │   │   ├── events.jsonl       ← SOURCE OF TRUTH
│               │   │   ├── logs/
│               │   │   │   └── log.log        ← Legacy (deprecated)
│               │   │   └── data/
│               │   └── 02/
│               │       ├── events.jsonl       ← Current attempt
│               │       └── ...
│               └── checkpoint.json
```

### Event Schema

```typescript
// Base event
interface TaskEvent {
  timestamp: string; // ISO 8601
  type: TaskEventType;
  level?: "debug" | "info" | "warning" | "error";
  [key: string]: any; // Event-specific data
}

// Event types
enum TaskEventType {
  // Lifecycle
  TASK_START = "task_start",
  TASK_COMPLETE = "task_complete",
  TASK_FAILED = "task_failed",
  RETRY_START = "retry_start",

  // Tool usage
  TOOL_USE_START = "tool_use_start",
  TOOL_USE_COMPLETE = "tool_use_complete",
  TOOL_USE_ERROR = "tool_use_error",

  // File operations
  FILE_CREATED = "file_created",
  FILE_MODIFIED = "file_modified",
  FILE_DELETED = "file_deleted",
  FILE_VERIFIED = "file_verified",

  // Validation
  VALIDATION_START = "validation_start",
  VALIDATION_RESULT = "validation_result",
  CHECK_PASSED = "check_passed",
  CHECK_FAILED = "check_failed",

  // AI
  AI_REASONING = "ai_reasoning",
  AI_PLANNING = "ai_planning",
  AI_ERROR = "ai_error",

  // Gap resolution
  GAP_DETECTED = "gap_detected",
  GAP_RESOLVED = "gap_resolved",
  STRATEGY_APPLIED = "strategy_applied",
}
```

## Summary

### File-First Principles

1. ✅ **Write events to JSONL first** - All events go to `events.jsonl`
2. ✅ **Console reads from file** - Formatter tails events file
3. ✅ **Events are immutable** - Append-only, never modify
4. ✅ **Multiple consumers** - Different views from same source
5. ✅ **Replay capability** - Can recreate console output anytime
6. ✅ **Analysis friendly** - Structured data for debugging

### Migration Path

**Phase 1**: Add event writer alongside current logging

- Keep existing logs
- Start writing events.jsonl
- No console changes yet

**Phase 2**: Add console formatter

- Read events.jsonl
- Display formatted output
- Run in parallel with old logs

**Phase 3**: Replace old logging

- Remove timer-based logging
- Remove JSON dumps to console
- Keep only event-driven system

**Phase 4**: Cleanup

- Remove legacy log files
- Archive old logs
- Document new system
