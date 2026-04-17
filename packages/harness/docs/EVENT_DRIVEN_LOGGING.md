# Event-Driven Progressive Logging

## Problem with Current Approach

**Current**: Time-based polling (every 1 minute)
```
⏳ 1m 0s  │  AI  │  Generate Design: undefined
📋 Last activity 1m 0s ago:
   ▸ [STDOUT] {"type":"user","message":...

⏳ 2m 0s  │  AI  │  Generate Design: undefined
📋 Last activity 2m 0s ago:
   ▸ [STDOUT] {"type":"assistant","message":...

⏳ 3m 0s  │  AI  │  Generate Design: undefined
📋 Last activity 3m 0s ago:
   ▸ [STDOUT] {"type":"assistant","message":...
```

**Issues**:
- ❌ Logs every minute regardless of activity
- ❌ Shows JSON dumps instead of meaningful progress
- ❌ Misses important events between intervals
- ❌ User stares at screen with no feedback for 59 seconds
- ❌ Floods log when nothing is happening

## Better Approach: Event-Driven Logging

**Principle**: Log when something MEANINGFUL happens, not on a timer.

### Important Events to Log

#### 1. Tool Execution Events

```typescript
// When AI uses a tool
🛠️  Read .stitch/prompts/home-lesson-tree.md
   └─ 4.2 KB loaded (150 lines of design intent)

🛠️  Skill: stitch-generate
   └─ Generating HTML for home-lesson-tree screen...

✍️  Write .stitch/designs/home-lesson-tree.html
   └─ Creating 847 lines of production HTML (42.3 KB)

✅ Bash: test -f .stitch/designs/home-lesson-tree.html
   └─ Verification: File exists
```

**Trigger**: Claude API returns tool_use event

#### 2. AI Reasoning Events

```typescript
// When AI provides significant reasoning
💭 Analysis: Design requires mobile-first layout with zigzag pattern
   └─ Components identified: header, lesson nodes, navigation

💭 Planning: Will use Stitch CLI to generate HTML, then verify output
   └─ Expected output: ~800 lines with inline CSS

💭 Debugging: Previous attempt failed - directory doesn't exist
   └─ Solution: Create .stitch/designs/ before writing file
```

**Trigger**: Claude API returns text block with reasoning

#### 3. File System Events

```typescript
// When files are created/modified
📄 Created: .stitch/designs/home-lesson-tree.html
   └─ Size: 42.3 KB
   └─ Lines: 847
   └─ Type: HTML5 with inline CSS

📝 Modified: .stitch/DESIGN.md
   └─ Added: Color palette definitions
   └─ Changes: +12 lines

🗑️  Deleted: .stitch/designs/draft.html
   └─ Reason: Replaced with final version
```

**Trigger**: File watch events or tool completion callbacks

#### 4. Validation Events

```typescript
// When outputs are validated
✅ Output validation: .stitch/designs/home-lesson-tree.html
   └─ Exists: ✓
   └─ Size: 42.3 KB (expected: >10 KB)
   └─ Format: Valid HTML5

❌ Check failed: design-exists
   └─ File not found: .stitch/designs/home-lesson-tree.html
   └─ Directory exists: ✓ .stitch/designs/
   └─ Possible cause: Write operation failed silently

✅ All checks passed (3/3)
   └─ design-exists: File present
   └─ design-valid: HTML validates
   └─ design-complete: All sections present
```

**Trigger**: After AI completion, before marking task done

#### 5. Phase Transition Events

```typescript
// When task moves between phases
🎬 Starting task: Generate Design: Home Lesson Tree
   └─ Inputs: 2 files (all present)
   └─ Outputs: 1 file (missing)
   └─ Strategy: AI generation with Stitch

🔍 Gap detected: Output missing
   └─ Type: output
   └─ Missing: .stitch/designs/home-lesson-tree.html
   └─ Resolution: task-run strategy

🔄 Retry #1: Output not created
   └─ Previous duration: 2m 51s
   └─ Previous outcome: AI reported success, file missing
   └─ Enhanced strategy: Pre-create directory + verify write

🎉 Task completed
   └─ Duration: 2m 51s
   └─ Attempts: 1
   └─ Outputs: 1 created, 0 missing
```

**Trigger**: State machine transitions

#### 6. Error Events

```typescript
// When errors occur
⚠️  Tool execution failed: Bash
   └─ Command: stitch generate home-lesson-tree
   └─ Exit code: 1
   └─ Error: Command not found: stitch
   └─ Suggestion: Install Stitch CLI or check PATH

❌ Timeout: AI agent exceeded 5m limit
   └─ Last activity: 4m 32s ago
   └─ Status: Tool use in progress (Write operation)
   └─ Action: Terminating and retrying

⚠️  Validation warning: Output file smaller than expected
   └─ Expected: >40 KB
   └─ Actual: 12.3 KB
   └─ Action: Continuing but flagged for review
```

**Trigger**: Error callbacks, timeout handlers

## Implementation Strategy

### 1. Event Stream Architecture

```typescript
// Central event bus for all task events
class TaskEventBus {
  private handlers: Map<TaskEventType, EventHandler[]>;

  emit(event: TaskEvent): void {
    // 1. Write to structured log (JSONL)
    this.writeToJournal(event);

    // 2. Format for console (if important)
    if (this.isImportant(event)) {
      this.logToConsole(event);
    }

    // 3. Update progress state
    this.updateProgress(event);

    // 4. Trigger handlers
    this.handlers.get(event.type)?.forEach(h => h(event));
  }

  isImportant(event: TaskEvent): boolean {
    // Only log significant events to console
    return ![
      'INTERNAL_STATE_CHANGE',
      'HEARTBEAT',
      'STREAM_CHUNK',
    ].includes(event.type);
  }
}
```

### 2. Event Priority Levels

```typescript
enum EventPriority {
  CRITICAL = 0,  // Task start/end, failures - always show
  HIGH = 1,      // Tool calls, validations - show by default
  MEDIUM = 2,    // AI reasoning, file ops - show in verbose mode
  LOW = 3,       // State changes - journal only
  DEBUG = 4,     // Raw data - debug mode only
}

const EVENT_PRIORITIES: Record<TaskEventType, EventPriority> = {
  TASK_START: EventPriority.CRITICAL,
  TASK_COMPLETE: EventPriority.CRITICAL,
  TASK_FAILED: EventPriority.CRITICAL,

  TOOL_USE_START: EventPriority.HIGH,
  TOOL_USE_COMPLETE: EventPriority.HIGH,
  VALIDATION_RESULT: EventPriority.HIGH,

  AI_REASONING: EventPriority.MEDIUM,
  FILE_CREATED: EventPriority.MEDIUM,

  STATE_TRANSITION: EventPriority.LOW,
  STREAM_EVENT: EventPriority.DEBUG,
};
```

### 3. Smart Event Aggregation

```typescript
// Instead of logging every tool call, aggregate related ones
class EventAggregator {
  private buffer: TaskEvent[] = [];
  private timeout: NodeJS.Timeout;

  add(event: TaskEvent): void {
    this.buffer.push(event);

    // Flush after 100ms of inactivity OR buffer is full
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.flush(), 100);

    if (this.buffer.length >= 10) {
      this.flush();
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;

    // Aggregate similar events
    const grouped = this.groupByType(this.buffer);

    // Example: Multiple file reads -> Single summary
    const reads = grouped.get('TOOL_USE_READ') || [];
    if (reads.length > 1) {
      console.log(`📖 Read ${reads.length} files (${this.totalSize(reads)})`);
      reads.forEach(r => console.log(`   └─ ${r.filePath}`));
    } else if (reads.length === 1) {
      console.log(`📖 Read ${reads[0].filePath} (${reads[0].size})`);
    }

    this.buffer = [];
  }
}
```

### 4. Context-Aware Formatting

```typescript
class ProgressFormatter {
  format(event: TaskEvent, context: TaskContext): string {
    switch (event.type) {
      case 'TOOL_USE_START':
        return this.formatToolStart(event, context);

      case 'TOOL_USE_COMPLETE':
        return this.formatToolComplete(event, context);

      case 'AI_REASONING':
        return this.formatReasoning(event, context);

      case 'VALIDATION_RESULT':
        return this.formatValidation(event, context);
    }
  }

  formatToolStart(event: ToolUseEvent, context: TaskContext): string {
    const icon = this.getToolIcon(event.toolName);
    const action = this.getToolAction(event.toolName);

    // Add context if this is a retry or recovery action
    const suffix = context.isRetry
      ? ` (retry #${context.attemptNumber})`
      : '';

    return `${icon} ${action} ${event.params.file}${suffix}`;
  }

  formatToolComplete(event: ToolUseEvent, context: TaskContext): string {
    const icon = event.success ? '✅' : '❌';
    const duration = this.formatDuration(event.durationMs);

    if (event.toolName === 'Write' && event.success) {
      const size = this.formatSize(event.result.fileSize);
      const lines = event.result.lines;
      return `${icon} Created ${event.params.file} (${size}, ${lines} lines) in ${duration}`;
    }

    return `${icon} ${event.toolName} ${event.success ? 'completed' : 'failed'} in ${duration}`;
  }
}
```

### 5. Fallback Timer (Safety Net Only)

```typescript
class ProgressMonitor {
  private lastEvent: Date = new Date();
  private silenceThreshold = 30000; // 30 seconds

  onEvent(event: TaskEvent): void {
    this.lastEvent = new Date();
  }

  startMonitoring(): void {
    // Only log if no events for 30s (indicating potential hang)
    setInterval(() => {
      const silenceDuration = Date.now() - this.lastEvent.getTime();

      if (silenceDuration > this.silenceThreshold) {
        console.log(`⏸️  No activity for ${Math.floor(silenceDuration / 1000)}s`);
        console.log(`   Last event: ${this.getLastEventSummary()}`);
        console.log(`   Status: ${this.getCurrentStatus()}`);
      }
    }, 30000);
  }
}
```

## Example Event Flow

### Scenario: Successful Task Execution

```
🎬 Starting: Generate Design: Home Lesson Tree
   └─ Inputs: 2✓  Outputs: 1✗

📖 Read .stitch/prompts/home-lesson-tree.md
   └─ Loaded 4.2 KB (150 lines)

📖 Read .stitch/DESIGN.md
   └─ Loaded 1.8 KB (design tokens)

💭 Analyzing requirements
   └─ Mobile-first zigzag lesson tree with gamification

🛠️  Skill: stitch-generate (screen=home-lesson-tree)
   └─ Invoking Stitch AI...

   [30s of silence - Stitch working, no logging needed]

✅ Stitch completed
   └─ Generated HTML with inline CSS

✍️  Write .stitch/designs/home-lesson-tree.html
   └─ Created 42.3 KB (847 lines)

✅ Verification: File exists at expected path

✅ Validation passed
   └─ Output: .stitch/designs/home-lesson-tree.html ✓
   └─ Check: design-exists ✓

🎉 Completed in 2m 51s
```

**Total output**: ~12 lines vs current ~50+ lines
**Event count**: 8 meaningful events vs 3 timer ticks with JSON dumps

### Scenario: Retry with Diagnosis

```
🎬 Starting: Generate Design: Home Lesson Tree
   └─ Attempt #2 (previous: output missing)

📖 Read .stitch/prompts/home-lesson-tree.md
   └─ Loaded 4.2 KB

💭 Reviewing previous attempt logs
   └─ Issue: Write succeeded but file disappeared
   └─ Hypothesis: Parent directory missing

🛠️  Bash: mkdir -p .stitch/designs
   └─ Created directory structure

✍️  Write .stitch/designs/home-lesson-tree.html
   └─ Created 42.3 KB with pre-verified directory

🔍 Immediate verification
   └─ File exists: ✓
   └─ File readable: ✓
   └─ Size correct: ✓

✅ Validation passed

🎉 Completed in 1m 12s (resolved after directory fix)
```

**Key difference**: Shows WHAT changed between attempts and WHY it worked this time.

## Configuration

```typescript
// .harness/config/logging.ts
export const loggingConfig = {
  // Event filtering
  minPriority: EventPriority.HIGH,  // Show HIGH and CRITICAL only

  // Event aggregation
  aggregateWindow: 100, // ms
  maxBufferSize: 10,

  // Silence detection
  silenceThreshold: 30000, // 30s before "no activity" warning

  // Formatting
  useColor: true,
  useIcons: true,
  timestampFormat: 'relative', // "2m 15s ago" vs "15:27:13"

  // Verbosity modes
  verbose: false,  // Include MEDIUM priority events
  debug: false,    // Include DEBUG events + raw JSON
};
```

## Summary

### Key Principles

1. **Event-Driven, Not Time-Driven**: Log when things happen, not on a schedule
2. **Signal Over Noise**: Only log meaningful events (tool calls, validations, errors)
3. **Context-Aware**: Format differently based on retry state, task type, error history
4. **Aggregate Similar Events**: Group related operations into single log line
5. **Progressive Detail**: More detail on failures, less on successes
6. **Silence = Good**: 30s of no logs means AI is working, not that logging is broken

### Benefits vs Current Approach

| Current (Time-Based) | Proposed (Event-Driven) |
|---------------------|------------------------|
| ⏰ Log every 60s | 📊 Log on events |
| 📋 Shows JSON dumps | 💬 Shows human-readable summaries |
| ❓ "Last activity 1m ago" | ✅ "Created file.html (42 KB)" |
| 🔁 Repeats same info | 🎯 Only new information |
| 📊 50+ lines per minute | 📊 ~4 lines per significant event |
| ❌ Misses events between ticks | ✅ Captures everything |
| ⏱️ User waits for next tick | ⏱️ Instant feedback |

### Implementation Roadmap

**Phase 1**: Event bus infrastructure
- TaskEventBus with priority filtering
- Event types and schemas
- Console formatters

**Phase 2**: AI integration
- Hook into Claude API callbacks
- Extract tool uses and reasoning
- Emit structured events

**Phase 3**: File system integration
- Watch for file creation/modification
- Emit on validation checkpoints
- Track output changes

**Phase 4**: Smart aggregation
- EventAggregator for similar events
- Context-aware formatting
- Retry diagnosis

**Phase 5**: Polish
- Icons and colors
- Progress bars for long operations
- Collapsible sections for verbose data
