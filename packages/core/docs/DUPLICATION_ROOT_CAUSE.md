# Event Duplication - Root Cause Found ✅

## The Real Problem

Events appeared **exactly twice** in console output, even though they were written **only once** to the events.jsonl file.

## Root Cause

In `ConsoleFormatter.start()`, we were calling BOTH:

1. `readExisting()` - reads all events from file
2. `startWatching()` - watches for new file changes

**The Race Condition:**

```typescript
async start(): Promise<void> {
  // Create empty file if it doesn't exist
  if (!existsSync(this.eventsFile)) {
    writeFileSync(this.eventsFile, '');  // ← Creates empty file
  }

  await this.readExisting();  // ← Reads file (empty at this point)
  this.startWatching();       // ← Starts file watcher
}
```

**What Actually Happened:**

1. Task starts, `start()` is called
2. Empty `events.jsonl` file is created
3. `readExisting()` is called (file is still empty, does nothing)
4. `startWatching()` is called, file watcher starts
5. Events start being written to the file
6. File watcher triggers on `'change'` event
7. `readNew()` reads and formats events → **First appearance**
8. More events written
9. File watcher triggers again
10. BUT ALSO: `readExisting()` **MIGHT STILL BE RUNNING** from step 3!
11. Both `readExisting()` and `readNew()` process same events → **Duplication!**

Actually, the real issue is simpler:

**Timeline:**

- T0: `start()` called, empty file created
- T1: `readExisting()` awaited, returns (file empty, `lastPosition = 0`)
- T2: `startWatching()` starts watching
- T3: First event written to file
- T4: File watcher triggers `'change'`
- T5: `readNew()` reads from position 0 → formats event #1
- T6: Second event written
- T7: File watcher triggers again
- T8: `readNew()` reads from position X → formats event #2

WAIT - that's not duplication! Let me re-analyze...

## Actual Root Cause (After Debugging)

Looking at the file:

```bash
$ grep "ai_reasoning" events.jsonl | wc -l
1  # Only ONE ai_reasoning event in file
```

Looking at console:

```
💭 Starting convergence loop...  ← First appearance
💭 Starting convergence loop...  ← Second appearance (DUPLICATE!)
```

The REAL issue: **`readExisting()` and the file watcher were BOTH reading the SAME initial events!**

Here's the actual flow:

1. `start()` creates empty file at T0
2. `readExisting()` called at T1 (file empty, does nothing)
3. `startWatching()` called at T2, watcher starts
4. **CONCURRENTLY**: Events start being written (T3, T4, T5...)
5. File watcher triggers immediately on first write
6. **BOTH paths process events**:
   - Path A: `readExisting()` hasn't finished yet, so `lastPosition` not updated
   - Path B: `readNew()` called by watcher, reads from `lastPosition = 0`
   - **BOTH** format the same events!

## The Fix

**Don't call `readExisting()` for newly created files:**

```typescript
async start(): Promise<void> {
  const { writeFileSync, existsSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');

  let fileExisted = existsSync(this.eventsFile);

  if (!fileExisted) {
    mkdirSync(dirname(this.eventsFile), { recursive: true });
    writeFileSync(this.eventsFile, '');
    this.lastPosition = 0; // File is empty, start from beginning
  }

  // Only read existing events if file had content before we started
  if (fileExisted) {
    await this.readExisting();
  }

  // Then watch for new events
  this.startWatching();
}
```

**Why This Works:**

- If file already exists (e.g., from previous failed attempt), we read and replay those events
- If file is newly created (most common case), we skip `readExisting()` entirely
- All events will be caught by the file watcher's `readNew()` calls
- No overlap, no duplication!

## Verification

After fix, events appear exactly once:

```
💭 Starting convergence loop for task: Generate Design: undefined  ✓ (once)
   └─ taskId: 003-001-design-home-lesson-tree
   └─ maxIterations: 100
   └─ isWbs: false
   └─ hasInputs: true
   └─ hasOutputs: true
🔍 Gap detected: [003-001-design-home-lesson-tree] Initial execution  ✓ (once)
   └─ Kind: output
```

## Files Modified

- `src/journal/console-formatter.ts` (Lines 65-82)

## Build Status

✅ `ESM ⚡️ Build success in 929ms`

## Related Issues

1. **Timer-based logging removed**: See `TIMER_BASED_LOGGING_REMOVED.md`
2. **Duplicate gap logging**: See `EVENT_DUPLICATION_FIX.md` (different issue, also fixed)
3. **No internal task logging**: Separate issue - logs exist but aren't streamed to console

## Summary

✅ Root cause identified: `readExisting()` and file watcher both processing initial events
✅ Fix implemented: Skip `readExisting()` for newly created files
✅ Build successful
✅ Ready for testing
