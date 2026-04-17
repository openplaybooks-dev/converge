# Internal Task Logging - Where Are They?

## Your Question

> "why we have no internal task logging?"

## Short Answer

**You DO have internal logs!** They're being written to `.log` files in the task's logs directory. They're just not being **displayed** in the console in real-time.

## Where the Logs Are

When you see:
```
🤖 Running AI
   Task  : Generate Design: undefined
   Phase : run_task
   Logs  : /Users/.../tasks/003-001-design-home-lesson-tree/attempts/wip/logs
```

The **internal AI execution logs** are in that `Logs` directory:

```bash
$ ls -la .harness/journal/epics/02-prepare-designs/tasks/003-001-design-home-lesson-tree/attempts/wip/logs/

-rw-r--r--  1 user  staff  154522  2026-04-04T16-41-35-173Z_d895bdc2.log        ← AI execution log
-rw-r--r--  1 user  staff    9201  2026-04-04T16-41-35-173Z_d895bdc2.index.jsonl  ← Tool call index
-rw-r--r--  1 user  staff    7244  events.jsonl                                   ← Task events (what you SEE)
-rw-r--r--  1 user  staff     604  log.log                                        ← Summary log
```

## What's Inside the `.log` Files

These files contain **everything** the AI is doing:

```bash
$ tail -50 2026-04-04T16-41-35-173Z_d895bdc2.log
```

Shows:
- AI thinking/reasoning
- Tool calls (Read, Write, Bash, etc.)
- Tool results
- API responses
- Token usage
- Costs
- Errors
- Final results

**Example snippet:**
```
[2026-04-04T16:42:58.993Z] [FINAL_RESULT] Perfect! The home-lesson-tree design
has been successfully generated and verified.

## ✅ Task Completed Successfully

The HTML design for **"home-lesson-tree"** has already been generated using
Stitch AI and is ready for use.

### Generated Files:
- **HTML**: `.stitch/designs/home-lesson-tree/design.html` (252 lines)
- **PNG**: `.stitch/designs/home-lesson-tree/design.png` (154 x 512 px PNG)

### Verification:
- ✅ PNG file is valid: 154x512 resolution, 8-bit RGB
- ✅ HTML file is complete with 252 lines of production-quality code
...
```

## Why You Don't See Them in Console

The current logging architecture has **two separate streams**:

### Stream 1: Task Events (events.jsonl) → Console
- **Written by**: `TaskEventWriter`
- **Read by**: `ConsoleFormatter`
- **Displayed**: Real-time in console with icons (🎬, 💭, 🔍, ✅)
- **Events**: task_start, gap_detected, gap_resolved, ai_reasoning, etc.

### Stream 2: AI Execution Logs (.log files) → File Only
- **Written by**: `agentfn` package
- **Read by**: Nobody (currently)
- **Displayed**: NOT shown in console
- **Content**: Full AI execution details, tool calls, streaming output

## The Gap

You see:
```
🤖 Running AI
   Task  : Generate Design: undefined
   Phase : run_task
   Logs  : /Users/.../logs

   ... (silence for 2-5 minutes) ...

   ✅ Resolved by: task-run
```

You WANT to see:
```
🤖 Running AI
   Task  : Generate Design: undefined

   💬 AI: Reading prompt file...
   📖 Read .stitch/prompts/home-lesson-tree.md (2.3 KB)

   💬 AI: Checking if design already exists...
   🔍 Stitch CLI: Checking .stitch/designs/home-lesson-tree.html

   💬 AI: Design found! Verifying...
   ✅ PNG: 154x512, valid
   ✅ HTML: 252 lines, complete

   ✅ Resolved by: task-run (1m 23s)
```

## Why This Happens

The `agentfn` package (which runs the AI) writes to its own log files, not to `events.jsonl`. The `ConsoleFormatter` only watches `events.jsonl`, so it never sees the detailed AI execution logs.

## Solutions

### Option 1: Tail the .log Files (Quick Fix)

Add real-time log tailing when AI is running:

```typescript
// In agent-runner.ts, after showing "🤖 Running AI" header:
const logTailer = spawn('tail', ['-f', logFile]);
logTailer.stdout.on('data', (chunk) => {
  // Parse and format log lines
  const lines = chunk.toString().split('\n');
  for (const line of lines) {
    if (line.includes('[TOOL_USE]')) {
      console.log(`   📝 ${formatToolUse(line)}`);
    } else if (line.includes('[REASONING]')) {
      console.log(`   💬 ${formatReasoning(line)}`);
    }
  }
});
```

### Option 2: Bridge the Streams (Better)

Make `agentfn` hooks write to both `.log` files AND `events.jsonl`:

```typescript
// In task-executor.ts:
const cfExecutor = agentfn({
  hooks: {
    onToolUse: (tool, params) => {
      // Write to both streams
      agentfn.log(`[TOOL_USE] ${tool}`, params);  // → .log file
      eventWriter.write({                          // → events.jsonl
        type: 'tool_use',
        tool,
        params
      });
    },
    onThinking: (text) => {
      agentfn.log(`[THINKING] ${text}`);
      eventWriter.aiThinking(text);
    }
  }
});
```

### Option 3: Unified Event Stream (Best)

Merge all logging into a single event stream:

1. Deprecate separate `.log` files
2. Write ALL events (task + AI + tools) to `events.jsonl`
3. `ConsoleFormatter` handles everything
4. Single source of truth

## Current Status

✅ **Logs exist**: All AI execution details are captured in `.log` files
⚠️  **Not displayed**: Console doesn't stream these logs in real-time
📁 **Manual access**: You can `tail -f` the `.log` files to watch AI execution

## Immediate Workaround

While AI is running, open another terminal and run:

```bash
tail -f .harness/journal/epics/*/tasks/*/attempts/wip/logs/*.log | grep -E "(TOOL_USE|REASONING|RESULT)"
```

This will show you what the AI is doing in real-time!

## Next Steps

Would you like me to implement:
1. **Quick fix**: Add log tailing to show AI activity
2. **Bridge streams**: Make agentfn write to events.jsonl
3. **Full solution**: Unified event stream architecture

Let me know which approach you prefer!
