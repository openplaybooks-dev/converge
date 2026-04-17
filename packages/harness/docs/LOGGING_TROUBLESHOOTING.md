# Logging System Troubleshooting Guide

## Current Status

The three-layer logging system is implemented and writing events. However, you may not see formatted console output immediately due to how the console formatter works.

## What's Happening

### Event Writing ✅

Events ARE being written to:
```
.harness/journal/epics/{epic}/tasks/{task}/attempts/wip/logs/events.jsonl
```

Each event is a JSON line in JSONL format.

### Console Formatter Behavior

The ConsoleFormatter:
1. ✅ Creates empty events.jsonl file if it doesn't exist
2. ✅ Starts watching the file for changes
3. ⚠️  Only formats events AFTER they're written to the file
4. ⚠️  May have slight delay (10-100ms) due to file system watch latency

## Verification

### Check Events Are Being Written

```bash
# View events file in real-time
tail -f .harness/journal/epics/*/tasks/*/attempts/wip/logs/events.jsonl

# Count events
wc -l .harness/journal/epics/*/tasks/*/attempts/wip/logs/events.jsonl

# View latest events
tail -10 .harness/journal/epics/*/tasks/*/attempts/wip/logs/events.jsonl | jq
```

### Expected Event Format

```jsonl
{"timestamp":"2026-04-04T16:30:17.971Z","type":"task_start","level":"critical","taskId":"003-001-design-home-lesson-tree","taskName":"Generate Design: Home Lesson Tree","attempt":3,"inputs":[".stitch/prompts/home-lesson-tree.md"],"outputs":[".stitch/designs/home-lesson-tree.html"]}
```

### Debug Logs

When running a task, you should see:
```
✅ Logged task_start event to .../logs/events.jsonl
📊 Event logging started → .../logs/events.jsonl
```

## Known Issues

### Issue 1: File Already Exists

**Problem**: Old journal system also writes to events.jsonl with different format

**Impact**: Both old and new events in same file

**Solution**: Our events use new format (task_start, task_complete, gap_detected, etc.) while old events use (CLAUDEFN_START, CLAUDEFN_COMPLETE, etc.)

**Filter**: Console formatter only processes our new event types

### Issue 2: File Watch Delay

**Problem**: File system watch has slight latency

**Impact**: Events may appear with 10-100ms delay

**Solution**: Normal behavior - file-first architecture prioritizes durability over instant display

### Issue 3: Buffered Writes

**Problem**: Non-critical events buffered for performance

**Impact**: May not flush immediately

**Solution**:
- Critical events (task_start, task_complete, gap_detected) flush immediately
- Other events flush every 100ms or when buffer reaches 10 events

## Testing the System

### Manual Test

1. Run a task:
```bash
pnpm harness run --step
```

2. In another terminal, tail the events:
```bash
tail -f .harness/journal/epics/*/tasks/*/attempts/wip/logs/events.jsonl
```

3. You should see events like:
```jsonl
{"timestamp":"...","type":"task_start","level":"critical",...}
{"timestamp":"...","type":"ai_reasoning","level":"info",...}
{"timestamp":"...","type":"gap_detected","level":"critical",...}
{"timestamp":"...","type":"gap_resolved","level":"critical",...}
{"timestamp":"...","type":"task_complete","level":"critical",...}
```

### Console Formatter Test

To test the formatter in isolation:

```typescript
import { ConsoleFormatter } from '@crew/harness';

const formatter = new ConsoleFormatter(
  '.harness/journal/epics/02-prepare-designs/tasks/003-001-design-home-lesson-tree/attempts/02/logs/events.jsonl',
  {
    minLevel: 'info',
    useColor: true,
    useIcons: true,
  }
);

await formatter.start();
// Will replay all events and display formatted output
```

## What You Should See

### In Console (Eventually)

```
🎬 Starting: Generate Design: Home Lesson Tree
   └─ Inputs: 1  Outputs: 1

💭 Starting convergence loop for task: Generate Design: Home Lesson Tree

🔍 Gap detected: Output file missing: .stitch/designs/home-lesson-tree.html

📝 Executing AI function: ai.fn

✅ Gap resolved by: TaskRunStrategy (2m 30s)

✅ COMPLETED in 3m 45s
```

### In events.jsonl

```jsonl
{"timestamp":"2026-04-04T16:30:17.971Z","type":"task_start","level":"critical","taskId":"003-001-design-home-lesson-tree"...}
{"timestamp":"2026-04-04T16:30:18.234Z","type":"ai_reasoning","level":"info","text":"Starting convergence loop for task: Generate Design: Home Lesson Tree"...}
{"timestamp":"2026-04-04T16:30:19.567Z","type":"gap_detected","level":"critical","gapId":"missing-output-home-lesson-tree"...}
{"timestamp":"2026-04-04T16:30:22.890Z","type":"ai_planning","level":"info","text":"Executing AI function: ai.fn"...}
{"timestamp":"2026-04-04T16:33:52.123Z","type":"gap_resolved","level":"critical","gapId":"missing-output-home-lesson-tree"...}
{"timestamp":"2026-04-04T16:34:02.456Z","type":"task_complete","level":"critical","taskId":"003-001-design-home-lesson-tree"...}
```

## Improvements Made

### v1.1 (Latest Build)

1. ✅ Console formatter creates empty file if it doesn't exist
2. ✅ Fixed file path to use logs/events.jsonl consistently
3. ✅ Critical events flush immediately (no buffering)
4. ✅ Debug logs show when events are written
5. ✅ Await formatter.start() to ensure watcher is ready

### Still Pending

- 🔄 Better error handling if file watch fails
- 🔄 Progress indicator while waiting for events
- 🔄 Real-time streaming without file watch delay
- 🔄 Separate files for old vs new event formats

## Next Steps

If you don't see formatted console output:

1. **Check events.jsonl exists and has content**
   ```bash
   cat .harness/journal/epics/*/tasks/*/attempts/wip/logs/events.jsonl
   ```

2. **Look for our event types** (not old CLAUDEFN_* events)
   ```bash
   grep -E "(task_start|task_complete|gap_detected|ai_reasoning)" .harness/journal/epics/*/tasks/*/attempts/wip/logs/events.jsonl
   ```

3. **Check for debug logs in console**
   ```
   ✅ Logged task_start event to ...
   📊 Event logging started → ...
   ```

4. **Run formatter manually** to replay events:
   ```typescript
   const formatter = new ConsoleFormatter(eventsFile);
   await formatter.start();
   ```

The system IS working - events are being written to files. The console formatter may just need tuning to display them in real-time more reliably.
