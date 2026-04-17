# Three-Layer Logging Architecture

## Overview

The Converge framework uses a **three-layer logging architecture** where each layer serves a specific purpose:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Session Logger (Orchestration Level)               │
│ .converge/journal/sessions/{sessionId}/                      │
│ - Tracks overall run: iterations, task selections           │
│ - High-level metrics: convergence, outcomes                 │
│ - Session metadata: config, environment                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓ spawns tasks
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Task Event Logger (Task Execution Level)           │
│ .converge/journal/epics/{epic}/tasks/{task}/attempts/{n}/    │
│ - Tracks task execution: tools, files, validation          │
│ - AI reasoning and decisions                                │
│ - Gap detection and resolution                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓ formatted view
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Console Formatter (User Display)                   │
│ - Reads from Layer 1 & 2                                    │
│ - Formats for human consumption                             │
│ - Real-time tail of event streams                           │
└─────────────────────────────────────────────────────────────┘
```

## Layer 1: Session Logger (Orchestration Level)

**Purpose**: Track entire autonomous run across multiple tasks

**Location**: `.converge/journal/sessions/{sessionId}/`

**Files**:
```
sessions/2026-04-04T09-44-30-rot6k8/
├── metadata.json          # Session config, environment, outcomes
├── events.jsonl           # Session-level events (JSONL)
├── progress.jsonl         # Progress snapshots per iteration
├── session.log            # Human-readable session log
└── errors/                # Error artifacts
```

### metadata.json
```json
{
  "sessionId": "2026-04-04T09-44-30-rot6k8",
  "projectName": "Mobile App Generator",
  "startTime": "2026-04-04T09:44:30.767Z",
  "endTime": "2026-04-04T09:54:52.609Z",
  "status": "complete",
  "duration": 621842,
  "config": {
    "maxIterations": 50,
    "maxAttemptsPerTask": 2
  },
  "outcomes": {
    "totalIterations": 14,
    "tasksCompleted": 13,
    "tasksFailed": 0,
    "convergenceAchieved": true
  }
}
```

### events.jsonl (Session Events)
```jsonl
{"timestamp":"2026-04-04T09:44:30.768Z","eventType":"SESSION_START","message":"Session started"}
{"timestamp":"2026-04-04T09:44:30.805Z","eventType":"ITERATION_START","message":"Iteration 1 started","metadata":{"iteration":1,"tasksComplete":5,"tasksTotal":25}}
{"timestamp":"2026-04-04T09:44:30.805Z","eventType":"TASK_SELECTED","message":"Task selected: 003-001-asset-logo"}
{"timestamp":"2026-04-04T09:44:30.806Z","eventType":"TASK_ATTEMPT_START","message":"Attempt 1 started"}
{"timestamp":"2026-04-04T09:45:43.348Z","eventType":"TASK_ATTEMPT_COMPLETE","message":"Attempt 1 succeeded","metadata":{"duration":72542}}
{"timestamp":"2026-04-04T09:45:43.348Z","eventType":"CONVERGENCE_ACHIEVED","message":"Task converged"}
{"timestamp":"2026-04-04T09:45:43.399Z","eventType":"ITERATION_START","message":"Iteration 2 started"}
```

### Session Event Types
- `SESSION_START`, `SESSION_END`
- `ITERATION_START`, `ITERATION_END`
- `TASK_SELECTED`, `TASK_SKIPPED`
- `TASK_ATTEMPT_START`, `TASK_ATTEMPT_COMPLETE`, `TASK_ATTEMPT_FAILED`
- `CONVERGENCE_ACHIEVED`, `CONVERGENCE_FAILED`
- `MAX_ITERATIONS_REACHED`, `EMERGENCY_STOP`

### When to Use Session Logger
- Autonomous runs (`converge run`)
- Multi-task orchestration
- Iteration-based execution
- High-level metrics tracking

## Layer 2: Task Event Logger (Task Execution Level)

**Purpose**: Track individual task execution in detail

**Location**: `.converge/journal/epics/{epic}/tasks/{task}/attempts/{n}/`

**Files**:
```
attempts/01/
├── events.jsonl           # Task execution events (NEW - file-first)
├── logs/
│   └── log.log            # Legacy AI agent logs (to be deprecated)
└── data/
    └── facts.json         # Task artifacts
```

### events.jsonl (Task Events)
```jsonl
{"timestamp":"2026-04-04T15:27:13.576Z","type":"task_start","taskId":"003-001-design-home-lesson-tree","inputs":[".stitch/prompts/home-lesson-tree.md"]}
{"timestamp":"2026-04-04T15:27:14.123Z","type":"tool_use_start","toolName":"Read","params":{"file":".stitch/prompts/home-lesson-tree.md"}}
{"timestamp":"2026-04-04T15:27:14.876Z","type":"tool_use_complete","toolName":"Read","success":true,"result":{"size":4234,"lines":150}}
{"timestamp":"2026-04-04T15:27:18.234Z","type":"ai_reasoning","text":"Analyzing design requirements for mobile-first zigzag lesson tree"}
{"timestamp":"2026-04-04T15:28:42.567Z","type":"tool_use_start","toolName":"Skill","params":{"skill":"stitch-generate"}}
{"timestamp":"2026-04-04T15:30:15.890Z","type":"tool_use_complete","toolName":"Skill","success":true}
{"timestamp":"2026-04-04T15:30:16.234Z","type":"file_created","path":".stitch/designs/home-lesson-tree.html","size":43234,"lines":847}
{"timestamp":"2026-04-04T15:30:16.567Z","type":"validation_result","output":".stitch/designs/home-lesson-tree.html","exists":true}
{"timestamp":"2026-04-04T15:30:16.890Z","type":"task_complete","duration":171234,"success":true}
```

### Task Event Types
- `task_start`, `task_complete`, `task_failed`, `retry_start`
- `tool_use_start`, `tool_use_complete`, `tool_use_error`
- `file_created`, `file_modified`, `file_deleted`, `file_verified`
- `validation_start`, `validation_result`, `check_passed`, `check_failed`
- `ai_reasoning`, `ai_planning`, `ai_thinking`, `ai_error`
- `gap_detected`, `gap_resolved`, `strategy_applied`, `strategy_failed`

### When to Use Task Event Logger
- Individual task execution
- AI agent tool calls
- File operations
- Output validation
- Retry logic with diagnosis

## Layer 3: Console Formatter (User Display)

**Purpose**: Format events for human consumption

**Reads From**:
- Layer 1: Session events (orchestration-level progress)
- Layer 2: Task events (task-level details)

**Output**: Formatted console display

### Example Console Output

```
┌─ 🎯 Autonomous Run: Mobile App Generator ───────────────────┐
│ Session: 2026-04-04T09-44-30-rot6k8                         │
│ Max Iterations: 50 │ Tasks: 13/25                           │
└─────────────────────────────────────────────────────────────┘

┌─ Iteration 1 ────────────────────────────────────────────────┐
│ Selected: 003-001-asset-logo (03-implement-app)             │
│ Attempt: 1/2                                                 │
└─────────────────────────────────────────────────────────────┘

  🎬 Starting: Generate Asset: Logo
     └─ Inputs: 1  Outputs: 1

  📖 Read .stitch/DESIGN.md (1.8 KB)

  💭 Generating SVG logo with spring green color palette
     └─ Style: Rounded, playful, mobile-friendly

  ✍️  Write src/assets/logo.svg (2.3 KB, 47 lines)

  ✅ Validation passed
     ✓ asset-exists

  ✅ COMPLETED in 1m 12s

✅ Iteration 1 complete: Task converged (1m 12s)

┌─ Iteration 2 ────────────────────────────────────────────────┐
│ Selected: 003-002-asset-icon-home (03-implement-app)        │
│ Attempt: 1/2                                                 │
└─────────────────────────────────────────────────────────────┘

  🎬 Starting: Generate Asset: Home Icon
     └─ Inputs: 1  Outputs: 1

  ...

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ SESSION COMPLETE                                          ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Duration: 10m 22s                                            ┃
┃ Iterations: 14                                               ┃
┃ Tasks Completed: 13                                          ┃
┃ Tasks Failed: 0                                              ┃
┃ Convergence: Achieved                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## How the Layers Work Together

### Scenario: Autonomous Run with 3 Tasks

#### Layer 1: Session Logger (High-Level)

```typescript
// Start session
sessionLogger.writeSessionStart();
// Session event: SESSION_START

// Iteration 1: Select and run task-1
sessionLogger.logEvent('ITERATION_START', { iteration: 1 });
sessionLogger.logEvent('TASK_SELECTED', { taskId: 'task-1' });
sessionLogger.logEvent('TASK_ATTEMPT_START', { attempt: 1 });

  // Layer 2 logs task-1 execution details...

sessionLogger.logEvent('TASK_ATTEMPT_COMPLETE', { success: true });
sessionLogger.logEvent('CONVERGENCE_ACHIEVED', { taskId: 'task-1' });

// Iteration 2: Select and run task-2
sessionLogger.logEvent('ITERATION_START', { iteration: 2 });
sessionLogger.logEvent('TASK_SELECTED', { taskId: 'task-2' });
sessionLogger.logEvent('TASK_ATTEMPT_START', { attempt: 1 });

  // Layer 2 logs task-2 execution details...

sessionLogger.logEvent('TASK_ATTEMPT_COMPLETE', { success: true });

// End session
sessionLogger.writeSessionEnd({ totalIterations: 2, tasksCompleted: 2 });
// Session event: SESSION_END
```

#### Layer 2: Task Event Logger (Detailed)

```typescript
// For each task execution
const taskEvents = new TaskEventWriter(
  `.converge/journal/epics/03-implement-app/tasks/task-1/attempts/01/events.jsonl`
);

taskEvents.taskStart({ taskId: 'task-1', taskName: 'Generate Asset: Logo' });
taskEvents.toolUseStart('Read', { file: '.stitch/DESIGN.md' });
taskEvents.toolUseComplete('Read', true, { size: 1800 });
taskEvents.aiReasoning('Generating SVG logo with spring green color palette');
taskEvents.toolUseStart('Write', { file: 'src/assets/logo.svg' });
taskEvents.fileCreated('src/assets/logo.svg', 2300, 47, true);
taskEvents.validationResult('src/assets/logo.svg', true, [{ id: 'asset-exists', passed: true }]);
taskEvents.taskComplete('task-1', 72000, ['src/assets/logo.svg']);

taskEvents.close();
```

#### Layer 3: Console Formatter (Display)

```typescript
// Formatter reads from BOTH layers

// Read session events for high-level structure
const sessionFormatter = new ConsoleFormatter(
  `.converge/journal/sessions/2026-04-04T09-44-30-rot6k8/events.jsonl`
);

// Read task events for execution details
const taskFormatter = new ConsoleFormatter(
  `.converge/journal/epics/03-implement-app/tasks/task-1/attempts/01/events.jsonl`
);

// Both formatters tail their respective files and output to console
// Session formatter shows: "Iteration 1 started"
// Task formatter shows: "🎬 Starting: Generate Asset: Logo"
```

## File Structure Overview

```
.converge/journal/
├── sessions/                              # Layer 1: Orchestration
│   └── 2026-04-04T09-44-30-rot6k8/
│       ├── metadata.json
│       ├── events.jsonl                   # Session-level events
│       ├── progress.jsonl
│       ├── session.log
│       └── errors/
│
└── epics/                                 # Layer 2: Task Execution
    └── 03-implement-app/
        └── tasks/
            └── 003-001-asset-logo/
                ├── checkpoint.json
                └── attempts/
                    └── 01/
                        ├── events.jsonl   # Task-level events (NEW)
                        ├── logs/
                        │   └── log.log    # Legacy (to deprecate)
                        └── data/
```

## Event Type Segregation

| Event Type | Layer 1 (Session) | Layer 2 (Task) |
|-----------|-------------------|----------------|
| Session lifecycle | ✅ SESSION_START, SESSION_END | ❌ |
| Iterations | ✅ ITERATION_START, ITERATION_END | ❌ |
| Task selection | ✅ TASK_SELECTED, TASK_SKIPPED | ❌ |
| Task attempts | ✅ TASK_ATTEMPT_START, TASK_ATTEMPT_COMPLETE | ❌ |
| Convergence | ✅ CONVERGENCE_ACHIEVED | ❌ |
| Task execution | ❌ | ✅ task_start, task_complete |
| Tool calls | ❌ | ✅ tool_use_start, tool_use_complete |
| File operations | ❌ | ✅ file_created, file_modified |
| AI reasoning | ❌ | ✅ ai_reasoning, ai_planning |
| Validation | ❌ | ✅ validation_result, check_passed |
| Gap resolution | ❌ | ✅ gap_detected, gap_resolved |

## Benefits of Three-Layer Architecture

### 1. Separation of Concerns
- **Layer 1**: "Which tasks ran and in what order?"
- **Layer 2**: "What did this specific task do?"
- **Layer 3**: "Show me in a way I can understand"

### 2. Different Time Scales
- **Layer 1**: Session duration (minutes to hours)
- **Layer 2**: Task duration (seconds to minutes)
- **Layer 3**: Real-time display (immediate)

### 3. Different Audiences
- **Layer 1**: Orchestration debugging, performance analysis
- **Layer 2**: Task debugging, AI behavior analysis
- **Layer 3**: User monitoring, progress tracking

### 4. Independent Consumption
- Can analyze session without reading all task logs
- Can debug specific task without loading entire session
- Can format output differently for different contexts

### 5. Replay Capability
```typescript
// Replay session at high level
replaySession('2026-04-04T09-44-30-rot6k8');
// Shows: Iteration 1 → task-1 → success → Iteration 2 → task-2 → success

// Drill down into specific task
replayTask('03-implement-app', '003-001-asset-logo', 1);
// Shows: Read file → AI reasoning → Write file → Validation → Complete
```

## Migration Path

### Current State
- ✅ Layer 1: Session logger exists
- ⚠️ Layer 2: Legacy log.log files (timer-based, JSON dumps)
- ❌ Layer 3: No formatter (direct console.log calls)

### Target State
- ✅ Layer 1: Session logger (keep as-is)
- ✅ Layer 2: Task event logger (file-first events.jsonl)
- ✅ Layer 3: Console formatter (reads from layers 1 & 2)

### Migration Steps

**Phase 1**: Add Layer 2 event logging
- Create `events.jsonl` alongside existing `log.log`
- Write events using `TaskEventWriter`
- Keep old logs during transition

**Phase 2**: Add Layer 3 formatter
- Create `ConsoleFormatter` that reads from layers 1 & 2
- Run in parallel with old console.log calls
- Verify output matches

**Phase 3**: Replace old logging
- Remove timer-based polling
- Remove JSON dumps to console
- Remove direct console.log calls
- Delete legacy `log.log` files

**Phase 4**: Polish
- Enhanced formatting
- Concurrent task display
- Progress bars
- Collapsible sections

## Summary

✅ **Three layers**: Session (orchestration), Task (execution), Console (display)
✅ **File-first**: All events written to JSONL files first
✅ **Separation**: Each layer has distinct purpose and scope
✅ **Independent**: Can analyze/replay each layer separately
✅ **Integrated**: Console formatter reads from both layers for complete view
✅ **Migration-friendly**: Can add new system alongside existing logging

The three-layer architecture provides complete observability from high-level orchestration down to individual tool calls, while keeping each layer focused and independently consumable.
