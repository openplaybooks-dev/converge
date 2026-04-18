# Real-time Log Streaming ✅

## What Was Implemented

Added **real-time streaming** of agentfn execution logs to the console, so you can see what the AI is doing during execution instead of staring at a blank screen.

## The Problem

Before this fix, when you ran a task, you saw:

```
🤖 Running AI
   Task  : Generate Design: undefined
   Phase : run_task
   Logs  : /Users/.../logs

   ... (complete silence for 2-5 minutes) ...

   ✅ Done in 1m 23s
```

**You had no idea what the AI was doing!** The logs were being written to `.log` files, but not displayed in the console.

## The Solution

Created `LogStreamer` class that:

1. Tails the `.log` files created by `agentfn`
2. Parses interesting events (tool calls, results, errors)
3. Formats and displays them in real-time to the console

## What You See Now

```
🤖 Running AI
   Task  : Generate Design: undefined
   Phase : run_task
   Logs  : /Users/.../logs

   📖 Reading .stitch/prompts/home-lesson-tree.md
   🔍 Searching: stitch screen generation
   📖 Reading .stitch/DESIGN.md
   🛠️  Skill: /stitch-generate
   ✍️  Writing .stitch/designs/home-lesson-tree.html
   ✅ Done in 1m 23s

   ✅ Resolved by: task-run
```

## Features

### Tool Call Tracking

Shows when AI uses tools:

- 📖 `Read` - Reading files
- ✍️ `Write` - Writing files
- ✏️ `Edit` - Editing files
- ⚙️ `Bash` - Running commands
- 🛠️ `Skill` - Calling skills
- 🔍 `WebSearch` - Searching the web
- 🌐 `WebFetch` - Fetching URLs

### Progress Indicators

- ✅ Success indicators when operations complete
- ❌ Error messages when operations fail
- ⏱️ Duration tracking for long operations

### Configurable Output

```typescript
new LogStreamer(logDir, {
  showToolCalls: true, // Show tool usage (default: true)
  showReasoning: false, // Show AI thinking (default: false, verbose)
  showResults: true, // Show final results (default: true)
  useColor: true, // Use colors (default: true)
  debounceMs: 100, // Batch updates (default: 100ms)
});
```

## Implementation Details

### LogStreamer Class

**Location**: `src/journal/log-streamer.ts`

**Key Methods**:

- `start()` - Start streaming logs
- `stop()` - Stop streaming
- `processLogLine()` - Parse and format individual log lines
- `formatToolUse()` - Format tool call events
- `formatResult()` - Format completion events

**Architecture**:

1. Uses Node.js `fs.watch()` to monitor log directory
2. Maintains `lastPosition` map for each log file
3. Reads only new content (incremental streaming)
4. Debounces updates to batch rapid changes
5. Parses JSON events and formatted log lines

### Integration with agent-runner.ts

**Before**:

```typescript
try {
  const executor = agentfn({ ... });
  const result = await executor();
  return result;
}
```

**After**:

```typescript
// Start real-time log streaming
const logStreamer = new LogStreamer(logDir, {
  showToolCalls: true,
  showReasoning: false,
  showResults: true,
  useColor: true,
});

try {
  await logStreamer.start();  // ← Start streaming
  const executor = agentfn({ ... });
  const result = await executor();
  logStreamer.stop();         // ← Stop streaming
  return result;
} catch (err) {
  logStreamer.stop();         // ← Stop on error too
  throw err;
}
```

## Files Modified

### New Files

- `src/journal/log-streamer.ts` - LogStreamer class implementation

### Modified Files

- `src/repair/agent-runner.ts` - Integrated LogStreamer
- `src/journal/index.ts` - Exported LogStreamer

## Build Status

✅ `ESM ⚡️ Build success in 924ms`

## Event Types Handled

The LogStreamer recognizes and formats these event types from agentfn logs:

| Log Level        | Description           | Example                                |
| ---------------- | --------------------- | -------------------------------------- |
| `TOOL_USE_START` | Tool call initiated   | `[TOOL_USE_START] {"name":"Read",...}` |
| `TOOL_RESULT`    | Tool result received  | `[TOOL_RESULT] {"success":true,...}`   |
| `STDOUT`         | Streaming JSON events | `[STDOUT] {"type":"tool_use",...}`     |
| `STREAM_EVENT`   | Event stream chunks   | `[STREAM_EVENT] {"type":"result",...}` |
| `FINAL_RESULT`   | Task completion       | `[FINAL_RESULT] Design generated`      |
| `ERROR`          | Error messages        | `[ERROR] File not found`               |
| `STDERR`         | Standard error        | `[STDERR] Permission denied`           |

## Performance Considerations

### Debouncing

- Updates are batched with 100ms debounce
- Prevents console spam during rapid file writes
- Configurable via `debounceMs` option

### Incremental Reading

- Only reads new content since last position
- Maintains position map for each log file
- Minimal disk I/O overhead

### Filtering

- Skips verbose events (REASONING, THINKING) by default
- Users can enable with `showReasoning: true`
- Level-based filtering (debug, info, warning, error)

## Comparison with Old Heartbeat

### Old Timer-Based Heartbeat (REMOVED)

- Printed every 60 seconds
- Showed last 4 log lines
- Verbose JSON dumps
- Not real-time (60s delay)
- Interrupted by new lines

### New Real-Time Streaming

- Shows events as they happen
- Clean, formatted output
- Only interesting events (tool calls, results)
- No interruptions
- Debounced for smooth display

## Example Output

### Generating a Design

```
🤖 Running AI
   Task  : Generate Design: Home Lesson Tree
   Phase : run_task
   Logs  : .../logs

   📖 Reading .stitch/prompts/home-lesson-tree.md
   📖 Reading .stitch/DESIGN.md
   🛠️  Skill: /stitch-generate
   📖 Reading .stitch/project.json
   ✍️  Writing .stitch/designs/home-lesson-tree/design.html
   ✍️  Writing .stitch/designs/home-lesson-tree/design.png
   ✅ Done in 2m 15s

   ✅ Resolved by: task-run
```

### Running Tests

```
🤖 Running AI
   Task  : Run tests
   Phase : verification
   Logs  : .../logs

   ⚙️  Running: npm test
   📖 Reading test-results.json
   ✏️  Editing src/components/Button.tsx
   ⚙️  Running: npm test
   ✅ Done in 45.2s

   ✅ Resolved by: verification
```

## Configuration Examples

### Verbose Mode (Show Everything)

```typescript
const logStreamer = new LogStreamer(logDir, {
  showToolCalls: true,
  showReasoning: true, // ← Show AI thinking
  showResults: true,
  minLevel: "debug", // ← Show debug logs
  useColor: true,
});
```

Output:

```
   💬 Analyzing prompt file structure...
   📖 Reading .stitch/prompts/home-lesson-tree.md
   💬 Extracting design requirements...
   💬 Checking for existing design...
   🛠️  Skill: /stitch-generate
   💬 Verifying output files...
   ✅ Done in 2m 15s
```

### Quiet Mode (Errors Only)

```typescript
const logStreamer = new LogStreamer(logDir, {
  showToolCalls: false, // ← Hide tool calls
  showReasoning: false,
  showResults: false, // ← Hide results
  minLevel: "error", // ← Only errors
  useColor: true,
});
```

Output:

```
   ❌ Error: File not found: .stitch/DESIGN.md
```

### Default Mode (Balanced)

```typescript
const logStreamer = new LogStreamer(logDir); // Uses defaults
```

Output:

```
   📖 Reading .stitch/prompts/home-lesson-tree.md
   🛠️  Skill: /stitch-generate
   ✍️  Writing .stitch/designs/home-lesson-tree/design.html
   ✅ Done in 2m 15s
```

## Future Enhancements

### Planned Features

- [ ] Progress bars for long-running operations
- [ ] Token usage display (input/output/cost)
- [ ] Colored output based on event type
- [ ] Expandable/collapsible sections for verbose output
- [ ] Real-time streaming to a web UI
- [ ] Replay mode for debugging past runs

### Nice-to-Have

- [ ] Filter by tool type (e.g., show only file operations)
- [ ] Time-based filtering (show events from last N seconds)
- [ ] Search/grep within streamed logs
- [ ] Export streaming logs to separate file

## Troubleshooting

### No logs appearing

**Check 1**: Verify log directory exists

```bash
ls -la .converge/journal/epics/*/tasks/*/attempts/wip/logs/
```

**Check 2**: Verify logs are being written

```bash
tail -f .converge/journal/epics/*/tasks/*/attempts/wip/logs/*.log
```

**Check 3**: Check LogStreamer configuration

```typescript
// Make sure showToolCalls is true
const logStreamer = new LogStreamer(logDir, {
  showToolCalls: true, // ← Must be true
});
```

### Too much output

**Solution**: Reduce verbosity

```typescript
const logStreamer = new LogStreamer(logDir, {
  showToolCalls: true,
  showReasoning: false, // ← Disable AI thinking
  showResults: false, // ← Disable full results
});
```

### Logs appear delayed

**Solution**: Reduce debounce interval

```typescript
const logStreamer = new LogStreamer(logDir, {
  debounceMs: 50, // ← Faster updates (default: 100ms)
});
```

## Related Documentation

- **Event Duplication Fix**: See `DUPLICATION_ROOT_CAUSE.md`
- **Timer-Based Logging Removal**: See `TIMER_BASED_LOGGING_REMOVED.md`
- **Internal Logs Location**: See `INTERNAL_LOGS_EXPLAINED.md`
- **Three-Layer Logging**: See `THREE_LAYER_LOGGING_IMPLEMENTATION.md`

## Summary

✅ **Real-time streaming**: See AI activity as it happens
✅ **Clean output**: Only interesting events (tool calls, results)
✅ **Configurable**: Control verbosity and event types
✅ **Performant**: Debounced, incremental reading
✅ **Integrated**: Works automatically with agent-runner.ts

No more staring at a blank screen wondering if the AI is stuck! You now see exactly what's happening in real-time.
