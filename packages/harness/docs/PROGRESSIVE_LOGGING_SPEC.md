# Progressive Logging Specification

## Current Issues

Based on the log output analysis:

1. **"undefined" in task names** - Missing screen title from parent task vars
2. **Too much raw JSON** - STDOUT/STREAM_EVENT logs showing full JSON payloads
3. **Unclear progress** - "Last activity 1m 0s ago" doesn't show actual AI work
4. **Repetitive headers** - Same separator lines every minute
5. **No context on retries** - Retry counters without explaining WHY
6. **Deprecation warnings mixed with progress** - Clutters the output
7. **No visual hierarchy** - Hard to scan for important info
8. **Missing success indicators** - AI says "done" but outputs still missing

## Improved Progressive Logging Design

### Phase 1: Task Initialization

```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 Generate Design: Home Lesson Tree                        │
│ Epic: 02-prepare-designs                                    │
│ Task: 003-001-design-home-lesson-tree                       │
│ Attempt: #2 (previous: failed validation)                   │
└─────────────────────────────────────────────────────────────┘

📂 Workspace
   └─ Journal: .harness/journal/epics/02-prepare-designs/tasks/003-001-design-home-lesson-tree/attempts/02/

📋 Task Configuration
   Inputs  (2): ✓ .stitch/prompts/home-lesson-tree.md
                ✓ .stitch/DESIGN.md
   Outputs (1): ✗ .stitch/designs/home-lesson-tree.html
   Checks  (1): design-exists

🎯 Objective
   Generate high-fidelity HTML design using Stitch AI from 150-line design intent prompt
```

### Phase 2: Gap Resolution (Initial)

```
┌─ Gap Analysis ──────────────────────────────────────────────┐
│ 🔍 Detected 1 gap: Initial execution                        │
│    Type: output                                              │
│    Strategy: task-run                                        │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: AI Execution (Enhanced Real-Time Updates)

**First Minute** (Initial context):
```
🤖 AI Agent Running
   ├─ Phase: run_task
   ├─ Model: claude-sonnet-4-5
   ├─ Started: 15:27:13
   └─ Logs: .../attempts/02/logs/

⏱️  0:15 │ 📖 Reading input files
   └─ Loaded: .stitch/prompts/home-lesson-tree.md (4.2 KB)
   └─ Loaded: .stitch/DESIGN.md (1.8 KB)

⏱️  0:32 │ 🔧 Tool: Read (.stitch/prompts/home-lesson-tree.md)
   └─ Understanding design requirements...

⏱️  0:58 │ 💭 Analyzing design intent
   └─ Identified: Mobile-first zigzag lesson tree with gamification
```

**Second Minute** (Progress context):
```
⏱️  1:15 │ 🛠️  Tool: Skill (stitch-generate)
   └─ Invoking Stitch AI for HTML generation...

⏱️  1:42 │ 🎨 Stitch generating HTML
   ├─ Screen: home-lesson-tree
   ├─ Device: mobile-first
   └─ Components: sticky header, lesson nodes, navigation

⏱️  2:08 │ ✍️  Tool: Write (.stitch/designs/home-lesson-tree.html)
   └─ Writing 847 lines of production HTML...
```

**Third Minute** (Completion context):
```
⏱️  2:34 │ ✅ File created: .stitch/designs/home-lesson-tree.html (42.3 KB)
   └─ Contains: semantic markup, inline CSS, animations, a11y features

⏱️  2:51 │ 🎉 AI task completed successfully
   └─ Duration: 2m 51s
   └─ Output: Production-ready HTML design with:
      • Sticky header with glassmorphism
      • Zigzag lesson tree (3 states: completed, current, locked)
      • Floating action button
      • Bottom navigation with micro-animations
```

### Phase 4: Output Validation

**Success Case**:
```
┌─ Validation ────────────────────────────────────────────────┐
│ ✅ All outputs created                                       │
│    ✓ .stitch/designs/home-lesson-tree.html (42.3 KB)        │
│                                                              │
│ ✅ All checks passed                                         │
│    ✓ design-exists: HTML design file exists                 │
│                                                              │
│ 🎯 Task completed successfully in 2m 51s                     │
└─────────────────────────────────────────────────────────────┘
```

**Failure Case (Current Issue)**:
```
┌─ Validation ────────────────────────────────────────────────┐
│ ⚠️  Output validation failed                                 │
│    ✗ .stitch/designs/home-lesson-tree.html (MISSING)        │
│                                                              │
│ ❌ Checks failed (1/1)                                       │
│    ✗ design-exists: File not found                          │
│                                                              │
│ 🔄 Retry #1: Output not created despite AI success          │
│    Possible causes:                                          │
│    • AI wrote to wrong path                                 │
│    • File creation failed silently                          │
│    • Tool execution error not caught                        │
│                                                              │
│ 📋 AI Session Analysis                                       │
│    • AI reported: "Output created successfully"             │
│    • Tool calls: Write (.stitch/designs/home-lesson-tree...)│
│    • Exit status: 0 (success)                               │
│    • Gap: AI thinks it succeeded but file missing           │
│                                                              │
│ 💡 Retry Strategy                                            │
│    Re-running with explicit file existence verification     │
└─────────────────────────────────────────────────────────────┘
```

### Phase 5: Retry Loop (Enhanced Context)

```
┌─ Retry #1 ──────────────────────────────────────────────────┐
│ 🔍 Re-analyzing gap with additional context                 │
│                                                              │
│ Previous Attempt Summary:                                    │
│   • AI Duration: 2m 51s                                      │
│   • AI Outcome: Reported success                            │
│   • Actual Result: Output file not created                  │
│   • Root Cause: Unknown (investigating)                     │
│                                                              │
│ Gap Details:                                                 │
│   • Missing: .stitch/designs/home-lesson-tree.html          │
│   • Check Failed: design-exists                             │
│   • Strategy: task-run (with enhanced verification)         │
└─────────────────────────────────────────────────────────────┘

🤖 AI Agent Running (Retry #1)
   ├─ Enhanced context: Previous attempt details
   ├─ Added verification: File existence check after write
   └─ Timeout: 5m (increased from 3m)

⏱️  0:22 │ 📖 Reading previous attempt logs
   └─ Analyzing why output wasn't created...

⏱️  0:45 │ 🔍 Detected issue: Write tool succeeded but no file
   └─ Possible cause: Parent directory doesn't exist

⏱️  1:03 │ 🛠️  Tool: Bash (mkdir -p .stitch/designs)
   └─ Creating output directory...

⏱️  1:18 │ ✅ Directory created successfully

⏱️  1:35 │ 🛠️  Tool: Skill (stitch-generate)
   └─ Generating HTML with verified output path...

⏱️  2:47 │ ✍️  Tool: Write (.stitch/designs/home-lesson-tree.html)
   └─ Writing with directory pre-check...

⏱️  3:02 │ ✅ File created and verified: .stitch/designs/home-lesson-tree.html
   └─ Size: 42.3 KB, Lines: 847

⏱️  3:15 │ 🎉 AI task completed with verification
```

**If Still Failing**:
```
┌─ Retry #2 ──────────────────────────────────────────────────┐
│ ⚠️  Persistent failure detected                              │
│                                                              │
│ Failure Pattern Analysis:                                    │
│   Attempt #1: Output not created (AI reported success)      │
│   Attempt #2: Directory created, write succeeded, verified  │
│   Attempt #2: Validation still fails → file disappeared?    │
│                                                              │
│ 🔬 Deep Diagnosis Mode                                       │
│   • Checking file permissions                               │
│   • Checking disk space                                     │
│   • Checking for competing processes                        │
│   • Examining AI session logs for anomalies                 │
│                                                              │
│ 💡 Escalation Strategy                                       │
│   • Max retries: 3                                          │
│   • Current retry: 2/3                                      │
│   • Next: Enhanced debugging with file watch                │
│   • If all fail: Mark as failed with diagnostic report      │
└─────────────────────────────────────────────────────────────┘
```

### Phase 6: Final Status

**Success**:
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ TASK COMPLETED                                           ┃
┃ 🎨 Generate Design: Home Lesson Tree                        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Attempts: 2                                                 ┃
┃ Duration: 6m 12s (including retries)                        ┃
┃ Outputs:  ✓ .stitch/designs/home-lesson-tree.html (42.3KB) ┃
┃ Checks:   ✓ design-exists                                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 📊 Next: 003-002-design-lesson-quiz                         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Failure**:
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ❌ TASK FAILED                                              ┃
┃ 🎨 Generate Design: Home Lesson Tree                        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Attempts: 3/3 (max retries exhausted)                       ┃
┃ Duration: 11m 48s                                           ┃
┃ Failure:  Output file not created consistently             ┃
┃ Missing:  .stitch/designs/home-lesson-tree.html             ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🔍 Diagnostic Report                                        ┃
┃    • AI consistently reports success                        ┃
┃    • Write tool executes without error                      ┃
┃    • File appears briefly then disappears                   ┃
┃    • Possible: competing process, filesystem issue          ┃
┃                                                              ┃
┃ 📋 Logs: .harness/journal/.../attempts/03/logs/             ┃
┃ 🐛 Debug: See error.log for detailed analysis               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 💡 Suggested Actions:                                       ┃
┃    1. Check .stitch/designs/ directory permissions          ┃
┃    2. Verify no auto-cleanup processes running              ┃
┃    3. Manually run: harness run --task 003-001... --debug   ┃
┃    4. Review AI session logs for tool execution details     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Implementation Guidelines

### 1. Structured Event Types

```typescript
enum LogEventType {
  // Lifecycle
  TASK_START = 'task_start',
  TASK_COMPLETE = 'task_complete',
  TASK_FAILED = 'task_failed',

  // Progress
  AI_THINKING = 'ai_thinking',
  AI_TOOL_START = 'ai_tool_start',
  AI_TOOL_COMPLETE = 'ai_tool_complete',
  FILE_CREATED = 'file_created',
  FILE_VERIFIED = 'file_verified',

  // Validation
  OUTPUT_VALID = 'output_valid',
  OUTPUT_MISSING = 'output_missing',
  CHECK_PASSED = 'check_passed',
  CHECK_FAILED = 'check_failed',

  // Retry
  RETRY_START = 'retry_start',
  RETRY_ANALYSIS = 'retry_analysis',
  GAP_DETECTED = 'gap_detected',
  STRATEGY_APPLIED = 'strategy_applied',
}
```

### 2. Context-Rich Progress Updates

```typescript
interface ProgressUpdate {
  timestamp: string;
  elapsed: string;  // "1m 35s"
  event: LogEventType;
  summary: string;  // User-friendly description
  details?: {
    toolName?: string;
    filePath?: string;
    fileSize?: string;
    exitCode?: number;
    aiThought?: string;  // Extracted from AI reasoning
  };
}
```

### 3. Smart Activity Summarization

Instead of:
```
📋 Last activity 1m 0s ago:
   ▸ [STDOUT] {"type":"user","message":{"role":"user","content":[...]
```

Show:
```
⏱️  1:15 │ 🛠️  Tool: Skill (stitch-generate)
   └─ Invoking Stitch AI for HTML generation...
   └─ Detected params: screen=home-lesson-tree, device=mobile
```

### 4. Retry Context with Root Cause

```typescript
interface RetryContext {
  attemptNumber: number;
  maxAttempts: number;
  previousOutcome: 'success_claimed' | 'error' | 'timeout';
  gapType: 'output_missing' | 'check_failed' | 'validation_error';
  rootCauseHypothesis: string;
  enhancedStrategy: string;
}
```

### 5. Visual Hierarchy

**Priority Levels**:
- 🎯 Critical: Task start/end, failures
- 📊 Important: Phase transitions, validations
- 💬 Info: Tool calls, file operations
- 🔍 Debug: AI reasoning, internal events

**Use Box Drawing**:
- `┌─┐ └─┘ ├─┤ ┬─┴` for sections
- `│` for indentation
- `└─` for tree structure

### 6. Suppress Noise

**Move to Debug Mode**:
- Deprecation warnings
- Full JSON payloads
- Internal state transitions
- STREAM_EVENT raw data

**Keep in Standard Output**:
- User-facing actions
- File operations
- AI tool usage (summarized)
- Validation results

## Summary

### Key Improvements

1. **Context First**: Every log message includes WHAT, WHY, and WHERE
2. **Visual Hierarchy**: Box drawing and icons for scanability
3. **Smart Summarization**: Extract meaning from AI events, don't dump JSON
4. **Retry Intelligence**: Explain WHY retrying and WHAT changed
5. **Progress Clarity**: Show actual AI work, not just "last activity"
6. **Failure Analysis**: Help debug by showing patterns and hypotheses
7. **Clean Output**: Move noise to debug logs, keep main output crisp
8. **Success Celebration**: Clear success indicators with metrics

### Example Full Flow (Compact)

```
┌─ 🎨 Generate Design: Home Lesson Tree ──────────────────────┐
│ Attempt #2 │ Inputs: 2✓ │ Outputs: 1✗                      │
└─────────────────────────────────────────────────────────────┘

🔍 Gap: Initial execution → Strategy: task-run

🤖 AI Running
   ⏱️  0:32 │ 📖 Loaded design requirements (6 KB)
   ⏱️  1:15 │ 🛠️  Stitch generating HTML...
   ⏱️  2:34 │ ✅ Created .stitch/designs/home-lesson-tree.html (42 KB)

✅ Validation passed (1/1 outputs, 1/1 checks)

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ COMPLETED in 2m 51s                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

This fits in ~10 lines vs current 50+ lines of JSON noise!
