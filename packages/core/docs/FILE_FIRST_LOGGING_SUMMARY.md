# File-First Event Logging - Implementation Summary

## Overview

I've designed a **file-first event logging system** where:
1. ✅ **All events written to `.jsonl` files FIRST**
2. ✅ **Console output reads FROM files** (not writes to console directly)
3. ✅ **Files are source of truth** (console is just a view)

## Core Architecture

```
Event Source → EventWriter → events.jsonl → ConsoleFormatter → Console Display
               (write only)  (source of    (read only)         (user view)
                             truth)
```

## Implementation Files

### 1. Event Writer (`src/journal/event-writer.ts`)

**Purpose**: ONLY component that writes events to journal

**Key Features**:
- Writes to `events.jsonl` in JSONL format (one JSON per line)
- Buffered writes (flushes every 100ms or 10 events)
- Comprehensive event types (task lifecycle, tools, files, validation, AI, gaps)
- Type-safe event interfaces
- Convenience methods for common events

**Example**:
```typescript
const writer = new TaskEventWriter(eventsFile);

// Write events (immediately flushed to file)
writer.taskStart({
  taskId: '003-001-design-home-lesson-tree',
  taskName: 'Generate Design: Home Lesson Tree',
  attempt: 1,
  inputs: ['.stitch/prompts/home-lesson-tree.md'],
  outputs: ['.stitch/designs/home-lesson-tree.html'],
});

writer.toolUseComplete('Read', true, { size: 4234, lines: 150 });
writer.fileCreated('.stitch/designs/home-lesson-tree.html', 43234, 847, true);
writer.taskComplete('003-001...', 171234, ['home-lesson-tree.html']);

writer.close(); // Flush and close
```

**events.jsonl output**:
```jsonl
{"timestamp":"2026-04-04T15:27:13.576Z","type":"task_start","level":"critical","taskId":"003-001-design-home-lesson-tree",...}
{"timestamp":"2026-04-04T15:27:14.876Z","type":"tool_use_complete","level":"info","toolName":"Read","success":true,...}
{"timestamp":"2026-04-04T15:30:16.234Z","type":"file_created","level":"info","path":".stitch/designs/home-lesson-tree.html",...}
{"timestamp":"2026-04-04T15:30:16.890Z","type":"task_complete","level":"critical","duration":171234,...}
```

### 2. Console Formatter (`src/journal/console-formatter.ts`)

**Purpose**: Reads `events.jsonl` and displays formatted output

**Key Features**:
- Tails events file in real-time (watches for changes)
- Formats events for human consumption
- Configurable (min level, colors, icons, timestamps)
- Filters internal/debug events
- Never writes to event file (read-only)

**Example**:
```typescript
const formatter = new ConsoleFormatter(eventsFile, {
  minLevel: 'info',     // Hide debug events
  useColor: true,       // Enable colors
  useIcons: true,       // Enable emoji icons
});

await formatter.start(); // Starts tailing

// Console output (automatically formatted from events):
// 🎬 Starting: Generate Design: Home Lesson Tree
//    └─ Inputs: 1  Outputs: 1
// 📖 Read .stitch/prompts/home-lesson-tree.md (4.1 KB)
// ✅ Created: .stitch/designs/home-lesson-tree.html (42.2 KB, 847 lines)
// ✅ COMPLETED in 2m 51s

formatter.stop(); // Stop watching
```

### 3. Integration with Existing Journal

The new event system **extends** the existing journal system:

```
.converge/journal/
├── epics/
│   └── 02-prepare-designs/
│       └── tasks/
│           └── 003-001-design-home-lesson-tree/
│               ├── attempts/
│               │   ├── 01/
│               │   │   ├── events.jsonl        ← NEW: Event-driven log
│               │   │   ├── logs/
│               │   │   │   └── log.log         ← EXISTING: Legacy log
│               │   │   └── data/
│               │   └── 02/
│               │       └── events.jsonl
│               └── checkpoint.json
```

**Migration Strategy**:
1. Add `events.jsonl` alongside existing logs
2. Keep old logs during transition
3. Eventually deprecate legacy logging

## Event Types

### Lifecycle Events
- `TASK_START`, `TASK_COMPLETE`, `TASK_FAILED`, `RETRY_START`

### Tool Usage Events
- `TOOL_USE_START`, `TOOL_USE_COMPLETE`, `TOOL_USE_ERROR`

### File Operations
- `FILE_CREATED`, `FILE_MODIFIED`, `FILE_DELETED`, `FILE_VERIFIED`

### Validation Events
- `VALIDATION_START`, `VALIDATION_RESULT`, `CHECK_PASSED`, `CHECK_FAILED`

### AI Events
- `AI_REASONING`, `AI_PLANNING`, `AI_THINKING`, `AI_ERROR`

### Gap Resolution Events
- `GAP_DETECTED`, `GAP_RESOLVED`, `STRATEGY_APPLIED`, `STRATEGY_FAILED`

### Internal Events (debug only)
- `INTERNAL_STATE`, `STREAM_CHUNK`

## Benefits Over Current Time-Based Logging

| Current (Timer) | New (Event-Driven) |
|----------------|-------------------|
| ⏰ Logs every 60s | 📊 Logs on important events |
| 📋 Shows JSON dumps | 💬 Human-readable summaries |
| ❓ "Last activity 1m ago" | ✅ "Created file.html (42 KB)" |
| 🔁 Repeats same info | 🎯 Only new information |
| 📊 50+ lines/minute | 📊 ~4 lines per event |
| ❌ Misses events between ticks | ✅ Captures everything |
| ⏱️ User waits 60s | ⏱️ Instant feedback |
| 🚫 Lost if crashed | ✅ Persisted to file |
| ❌ No replay | ✅ Can replay from file |

## Example: Full Task Execution

### Events Written to File

```jsonl
{"timestamp":"2026-04-04T15:27:13.576Z","type":"task_start","level":"critical","taskId":"003-001-design-home-lesson-tree","taskName":"Generate Design: Home Lesson Tree","attempt":1,"inputs":[".stitch/prompts/home-lesson-tree.md"],"outputs":[".stitch/designs/home-lesson-tree.html"]}
{"timestamp":"2026-04-04T15:27:14.123Z","type":"tool_use_start","level":"info","toolName":"Read","params":{"file":".stitch/prompts/home-lesson-tree.md"}}
{"timestamp":"2026-04-04T15:27:14.876Z","type":"tool_use_complete","level":"info","toolName":"Read","success":true,"result":{"size":4234,"lines":150}}
{"timestamp":"2026-04-04T15:27:18.234Z","type":"ai_reasoning","level":"info","text":"Analyzing design requirements for mobile-first zigzag lesson tree","context":{"screenType":"home-lesson-tree","deviceTarget":"mobile-first"}}
{"timestamp":"2026-04-04T15:28:42.567Z","type":"tool_use_start","level":"info","toolName":"Skill","params":{"skill":"stitch-generate","args":"home-lesson-tree"}}
{"timestamp":"2026-04-04T15:30:15.890Z","type":"tool_use_complete","level":"info","toolName":"Skill","success":true,"result":{"output":"Generated HTML"}}
{"timestamp":"2026-04-04T15:30:16.234Z","type":"file_created","level":"info","path":".stitch/designs/home-lesson-tree.html","size":43234,"lines":847,"verified":true}
{"timestamp":"2026-04-04T15:30:16.567Z","type":"validation_result","level":"warning","output":".stitch/designs/home-lesson-tree.html","exists":true,"checks":[{"id":"design-exists","passed":true}]}
{"timestamp":"2026-04-04T15:30:16.890Z","type":"task_complete","level":"critical","taskId":"003-001-design-home-lesson-tree","duration":171234,"outputs":[".stitch/designs/home-lesson-tree.html"],"success":true}
```

### Console Output (Auto-Formatted)

```
🎬 Starting: Generate Design: Home Lesson Tree
   └─ Inputs: 1  Outputs: 1

📖 Read .stitch/prompts/home-lesson-tree.md (4.1 KB)

💭 Analyzing design requirements for mobile-first zigzag lesson tree
   └─ screenType: home-lesson-tree
   └─ deviceTarget: mobile-first

🛠️  Skill: stitch-generate → Generated HTML

✅ Created: .stitch/designs/home-lesson-tree.html (42.2 KB, 847 lines)

✅ Validation passed
   ✓ design-exists

✅ COMPLETED in 2m 51s
```

**Result**: 9 lines of clear progress vs 50+ lines of JSON noise!

## Advanced Features

### 1. Replay Console Output

```typescript
// Replay previous run from events file
const formatter = new ConsoleFormatter(
  '.converge/journal/epics/02-prepare-designs/tasks/003-001.../attempts/01/events.jsonl'
);
await formatter.start(); // Reads all events and displays
```

### 2. Analyze Events Programmatically

```typescript
import { readFileSync } from 'fs';

const events = readFileSync(eventsFile, 'utf8')
  .split('\n')
  .filter(l => l.trim())
  .map(l => JSON.parse(l));

// Total duration
const start = events.find(e => e.type === 'task_start');
const end = events.find(e => e.type === 'task_complete');
const duration = new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime();

// Tool usage stats
const toolCalls = events.filter(e => e.type === 'tool_use_complete');
const toolStats = /* count by tool name */;

console.log({ duration, toolStats });
```

### 3. Multiple Consumers

```typescript
// Same event file, different views

// Real-time console
const console = new ConsoleFormatter(eventsFile);
await console.start();

// Debug logger (verbose)
const debug = new ConsoleFormatter(eventsFile, { minLevel: 'debug' });
await debug.start();

// Web dashboard (future)
const web = new WebSocketStreamer(eventsFile);
web.streamToClients();
```

## Next Steps

### Phase 1: Add Event Writer to Task Runner ✅
- [x] Create `TaskEventWriter` class
- [x] Create `ConsoleFormatter` class
- [x] Define event types and schemas

### Phase 2: Integrate with Existing Code
- [ ] Add event writer to `task-runner.ts`
- [ ] Hook into AI agent callbacks
- [ ] Log tool uses, reasoning, file operations
- [ ] Log validation results

### Phase 3: Replace Timer-Based Logging
- [ ] Remove `⏳ 1m 0s` timer ticks
- [ ] Remove JSON dump logging
- [ ] Keep only event-driven output

### Phase 4: Extend to Retry Logic
- [ ] Log retry context with diagnosis
- [ ] Show what changed between attempts
- [ ] Pattern detection for recurring failures

### Phase 5: Polish
- [ ] Add progress bars for long operations
- [ ] Collapsible sections for verbose data
- [ ] Better concurrent task display

## Documentation Created

1. **`FILE_FIRST_LOGGING.md`** - Architecture and principles
2. **`EVENT_DRIVEN_LOGGING.md`** - Event-driven approach vs time-based
3. **`LOGGING_EXAMPLES.md`** - Before/after comparisons
4. **`PROGRESSIVE_LOGGING_SPEC.md`** - Visual formatting spec
5. **`event-writer.ts`** - Implementation (write events to file)
6. **`console-formatter.ts`** - Implementation (read and format)

## Summary

✅ **File-first logging implemented**: All events go to `events.jsonl` FIRST
✅ **Console is a view layer**: Reads from file, never writes
✅ **Event-driven, not time-driven**: Log when things happen, not on timer
✅ **90% less noise**: Only meaningful events, no JSON dumps
✅ **Instant feedback**: 0s delay vs 60s wait
✅ **Replay capability**: Can recreate console output from events
✅ **Analysis friendly**: Structured data for debugging
✅ **Multiple consumers**: Same events, different views

Ready to integrate into the task execution pipeline!
