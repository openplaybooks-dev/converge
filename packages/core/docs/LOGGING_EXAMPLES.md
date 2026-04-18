# Logging Examples: Before vs After

## Example 1: Successful Task Execution

### BEFORE (Time-Based Polling)

```
Running: Generate Design: undefined
============================================================

🤖 Running AI
   Task  : Generate Design: undefined
   Logs  : /Users/minh/.../attempts/wip/logs

────────────────────────────────────────────────────────────
⏳ 1m 0s  │  AI  │  Generate Design: undefined
📋 Last activity 1m 0s ago:
   ▸ [STDOUT] {"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"Exit code 1\nEr…
   · [STREAM_EVENT] {"type":"user","message":{"role":"user","content":[{"type":"tool_result","content":"Exit code 1\nEr…
   · [TOOL_RESULT] Exit code 1
   · [CLAUDEFN_START] claudefn run_task: Generate Design: undefined
📂 Log: /Users/minh/.../log.log
────────────────────────────────────────────────────────────

────────────────────────────────────────────────────────────
⏳ 2m 0s  │  AI  │  Generate Design: undefined
📋 Last activity 2m 0s ago:
   ▸ [STDOUT] {"type":"assistant","message":{"model":"claude-sonnet-4-5","id":"msg_01AdQ3...
   · [STREAM_EVENT] {"type":"assistant","message":{"model":"claude-sonnet-4-5","id":"msg_01AdQ3...
   · [TOOL_USE] Tool: Bash
   · [CLAUDEFN_START] claudefn run_task: Generate Design: undefined
📂 Log: /Users/minh/.../log.log
────────────────────────────────────────────────────────────

────────────────────────────────────────────────────────────
⏳ 3m 0s  │  AI  │  Generate Design: undefined
📋 Last activity 3m 0s ago:
   ▸ [STDOUT] {"type":"assistant","message":{"model":"claude-sonnet-4-5","id":"msg_01Q8H...
   · [STREAM_EVENT] {"type":"assistant","message":{"model":"claude-sonnet-4-5","id":"msg_01Q8H...
   · [TOOL_USE] Tool: Bash
   · [CLAUDEFN_START] claudefn run_task: Generate Design: undefined
📂 Log: /Users/minh/.../log.log
────────────────────────────────────────────────────────────

✅ Done in 3m 46s
```

**Line count**: ~50 lines of mostly JSON
**Information density**: Very low (can't tell what AI is actually doing)
**User experience**: Staring at timer ticks and JSON dumps

---

### AFTER (Event-Driven)

```
┌─ 🎨 Generate Design: Home Lesson Tree ──────────────────────┐
│ Attempt #1 │ Inputs: 2✓ │ Outputs: 1✗                      │
└─────────────────────────────────────────────────────────────┘

📖 Read .stitch/prompts/home-lesson-tree.md (4.2 KB)
📖 Read .stitch/DESIGN.md (1.8 KB)

💭 Analyzing requirements
   └─ Mobile-first zigzag lesson tree with gamification
   └─ Design tokens: Spring colors, playful mood, rounded shapes

🛠️  Skill: stitch-generate
   └─ Generating HTML for home-lesson-tree screen...
   └─ Device: mobile-first, Components: header, nodes, nav

✍️  Write .stitch/designs/home-lesson-tree.html
   └─ Created 42.3 KB (847 lines of HTML + inline CSS)

✅ Verification passed
   └─ Output exists: .stitch/designs/home-lesson-tree.html
   └─ Check passed: design-exists

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ COMPLETED in 2m 51s                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Line count**: ~17 lines of meaningful information
**Information density**: Very high (can see exact AI workflow)
**User experience**: Clear progress, understands what's happening

---

## Example 2: Retry with Missing Output

### BEFORE (Time-Based)

```
✅ Done in 3m 46s
Verifying outputs...

── Retry 1 ──────────────────────────────────────────
2 gap(s) still unresolved:
  - incomplete: [003-001-design-home-lesson-tree] Task output not created: .stitch/designs/home-lesson-tree.html
  - incomplete: [003-001-design-home-lesson-tree] Check failed: HTML design exists for home-lesson-tree

── Resolving gap ────────────────────────────────────────
   Gap : [003-001-design-home-lesson-tree] Task output not created
   Kind: output
   Strategies (1): task-run

🤖 Running AI
   Task  : Generate Design: undefined
   Logs  : /Users/minh/.../attempts/wip/logs

────────────────────────────────────────────────────────────
⏳ 1m 0s  │  AI  │  Generate Design: undefined
📋 Last activity 1m 0s ago:
   · [CLAUDEFN_START] claudefn run_task: Generate Design: undefined
   · [CLAUDEFN_COMPLETE] claudefn run_task completed in 226397ms
   · [STRATEGY_SUCCEEDED] Strategy 'task-run' resolved gap
   · [CLAUDEFN_START] claudefn run_task: Generate Design: undefined
📂 Log: /Users/minh/.../log.log
────────────────────────────────────────────────────────────

✅ Done in 1m 8s
Resolved 2/2 gap(s) in 68.6s

── Retry 2 ──────────────────────────────────────────
2 gap(s) still unresolved:
  - incomplete: [003-001-design-home-lesson-tree] Task output not created
  - incomplete: [003-001-design-home-lesson-tree] Check failed
```

**Problem**: No explanation WHY it's retrying or WHAT changed
**User confusion**: "It says it completed successfully, why retry?"
**Debugging**: Impossible to understand the issue

---

### AFTER (Event-Driven with Diagnosis)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚠️  OUTPUT VALIDATION FAILED                                ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ AI reported success but output file missing:               ┃
┃ ✗ .stitch/designs/home-lesson-tree.html                    ┃
┃                                                              ┃
┃ 🔍 Diagnosis:                                               ┃
┃    • AI executed: Write .stitch/designs/home-lesson-tree... ┃
┃    • Tool reported: Success (exit code 0)                   ┃
┃    • File system: File not found                            ┃
┃    • Hypothesis: Parent directory doesn't exist             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─ 🔄 Retry #1: Creating missing directory ───────────────────┐
│ Previous attempt: 2m 51s (AI success, validation failed)   │
│ Enhanced strategy: Pre-create directory before write       │
└─────────────────────────────────────────────────────────────┘

🛠️  Bash: mkdir -p .stitch/designs
   └─ Created directory structure

📖 Read .stitch/prompts/home-lesson-tree.md (4.2 KB)

🛠️  Skill: stitch-generate
   └─ Generating with verified output path...

✍️  Write .stitch/designs/home-lesson-tree.html
   └─ Created 42.3 KB (directory pre-verified)

🔍 Immediate verification
   └─ File exists: ✓
   └─ File readable: ✓
   └─ Size: 42.3 KB ✓

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ RESOLVED in 1m 12s                                       ┃
┃ Root cause: Missing parent directory                        ┃
┃ Fix applied: Created .stitch/designs/ before write          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Clarity**: Immediately shows WHY retrying and WHAT was fixed
**User understanding**: "Oh, directory was missing, that makes sense"
**Debugging**: Shows hypothesis and verification of fix

---

## Example 3: Multiple Retries (Still Failing)

### BEFORE

```
── Retry 3 ──────────────────────────────────────────
2 gap(s) still unresolved:
  - incomplete: [003-001-design-home-lesson-tree] Task output not created
  - incomplete: [003-001-design-home-lesson-tree] Check failed

── Resolving gap ────────────────────────────────────────
   Gap : [003-001-design-home-lesson-tree] Task output not created
   Strategies (1): task-run

🤖 Running AI
   Task  : Generate Design: undefined
   Logs  : /Users/minh/.../attempts/wip/logs

────────────────────────────────────────────────────────────
⏳ 1m 0s  │  AI  │  Generate Design: undefined
📋 Last activity 1m 0s ago...
```

**Frustration**: Same output every retry, no learning
**No pattern detection**: Can't see that same issue repeats
**Escalation**: User doesn't know when to give up

---

### AFTER

```
┌─ 🔄 Retry #3: Persistent failure investigation ─────────────┐
│ Pattern detected: Output created then disappears            │
│ Attempts: All AI executions successful                      │
│ Validation: All validation checks fail                      │
│ Hypothesis: External process removing file                  │
└─────────────────────────────────────────────────────────────┘

🔬 Enhanced debugging enabled

🛠️  Bash: ls -la .stitch/designs/
   └─ Directory exists, permissions: rwxr-xr-x

🛠️  Skill: stitch-generate
   └─ Generating with immediate file lock...

✍️  Write .stitch/designs/home-lesson-tree.html
   └─ Created 42.3 KB

⏱️  0.5s │ File still exists: ✓
⏱️  1.0s │ File still exists: ✓
⏱️  2.0s │ File disappeared: ✗

🔍 Process monitor
   └─ Detected: 'auto-format' process modified .stitch/ directory
   └─ Action: File was moved to .stitch/designs/.formatted/

💡 Resolution found
   └─ Auto-formatter is interfering with output validation
   └─ File actually exists at: .stitch/designs/.formatted/home-lesson-tree.html

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚠️  EXTERNAL PROCESS INTERFERENCE                           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ File is being created successfully but moved by:            ┃
┃ Process: auto-format (prettier/eslint watch)                ┃
┃ Location: .stitch/designs/.formatted/                       ┃
┃                                                              ┃
┃ 📋 Recommended Actions:                                     ┃
┃ 1. Disable auto-format for .stitch/ directory               ┃
┃ 2. Update output path to .formatted/ subdirectory           ┃
┃ 3. Add .stitch/ to formatter ignore list                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Intelligence**: Detects pattern and investigates
**Root cause**: Identifies external interference
**Actionable**: Provides specific fixes

---

## Example 4: Concurrent Tasks Progress

### BEFORE (All tasks log at same minute)

```
⏳ 1m 0s  │  AI  │  Generate Design: undefined
⏳ 1m 0s  │  AI  │  Generate Design: undefined
⏳ 1m 0s  │  AI  │  Generate Design: undefined
📋 Last activity...
📋 Last activity...
📋 Last activity...
```

**Confusion**: Can't tell which task is which
**Spam**: 3x the logs at same time
**Unhelpful**: No way to track individual progress

---

### AFTER (Interleaved event streams)

```
┌─ 🎨 Generate Design: Home Lesson Tree ──────────────────────┐
├─ 🎨 Generate Design: Lesson Quiz ───────────────────────────┤
├─ 🎨 Generate Design: Progress Dashboard ────────────────────┤
└─────────────────────────────────────────────────────────────┘
   Running 3 tasks in parallel...

[home-lesson-tree] 📖 Read .stitch/prompts/home-lesson-tree.md (4.2 KB)
[lesson-quiz]      📖 Read .stitch/prompts/lesson-quiz.md (3.8 KB)
[progress-dash]    📖 Read .stitch/prompts/progress-dashboard.md (4.5 KB)

[home-lesson-tree] 🛠️  Skill: stitch-generate
[lesson-quiz]      🛠️  Skill: stitch-generate
[progress-dash]    🛠️  Skill: stitch-generate

[lesson-quiz]      ✍️  Write .stitch/designs/lesson-quiz.html (38.1 KB)
[lesson-quiz]      ✅ COMPLETED in 1m 45s

[home-lesson-tree] ✍️  Write .stitch/designs/home-lesson-tree.html (42.3 KB)
[home-lesson-tree] ✅ COMPLETED in 2m 12s

[progress-dash]    ✍️  Write .stitch/designs/progress-dashboard.html (51.7 KB)
[progress-dash]    ✅ COMPLETED in 2m 38s

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ ALL 3 TASKS COMPLETED                                    ┃
┃ Total time: 2m 38s (parallelized)                           ┃
┃ Average: 2m 11s per task                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Clarity**: Task prefix shows which is which
**Interleaved**: Natural flow of events as they happen
**Summary**: Shows parallelization benefit

---

## Summary Comparison

| Metric                  | Time-Based (Before) | Event-Driven (After)   |
| ----------------------- | ------------------- | ---------------------- |
| **Lines per task**      | ~50 lines           | ~15 lines              |
| **Information density** | Low (JSON dumps)    | High (human summaries) |
| **Debugging clarity**   | Poor (no context)   | Excellent (diagnosis)  |
| **User anxiety**        | High (minute waits) | Low (instant feedback) |
| **Pattern detection**   | None                | Automatic              |
| **Retry explanation**   | None                | Full context           |
| **Concurrent tasks**    | Confusing           | Clear prefixes         |
| **Success indicators**  | Unclear             | Crystal clear          |

## Key Improvements

1. **Instant Feedback**: Events logged as they happen (0s delay vs 60s delay)
2. **Human-Readable**: Summaries instead of JSON (`Created 42 KB` vs `{"type":"tool_result"...}`)
3. **Context-Aware**: Shows WHY retrying and WHAT changed
4. **Pattern Detection**: Identifies repeating failures and suggests fixes
5. **Root Cause Analysis**: Investigates persistent issues automatically
6. **Parallel Clarity**: Task prefixes prevent confusion
7. **90% Less Noise**: Only meaningful events, not periodic dumps
