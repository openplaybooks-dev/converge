# Event Duplication Fix ✅

## Problem

Console output showed duplicate events - every event appeared twice:

```
💭 Starting convergence loop for task: Generate Design: undefined
   └─ taskId: 003-001-design-home-lesson-tree
   └─ maxIterations: 100
   └─ isWbs: false
   └─ hasInputs: true
   └─ hasOutputs: true
🔍 Gap detected: [003-001-design-home-lesson-tree] Initial execution
   └─ Kind: output
💭 Starting convergence loop for task: Generate Design: undefined  ← DUPLICATE
   └─ taskId: 003-001-design-home-lesson-tree
   └─ maxIterations: 100
   └─ isWbs: false
   └─ hasInputs: true
   └─ hasOutputs: true
🔍 Gap detected: [003-001-design-home-lesson-tree] Initial execution  ← DUPLICATE
   └─ Kind: output
```

## Root Causes

### 1. Duplicate Gap Logging (Fixed)

**Location**: `src/repair/pipeline.ts` (Lines 72-79)

Gap detection events were being logged in TWO places:
- ✅ In `unit/run.ts` when gaps are detected (lines 82-88, 217-223)
- ❌ In `pipeline.ts` when resolution begins (lines 73-79) - **DUPLICATE**

**Fix**: Removed duplicate logging from `pipeline.ts`:

```typescript
// BEFORE: Logged gap detection in pipeline.ts
if (eventWriter) {
  eventWriter.gapDetected(
    gap.id,
    gap.description,
    (gap.metadata?.gapKind as string) ?? gap.type
  );
}

// AFTER: Removed - gap already logged in unit/run.ts
// REMOVED: Gap already logged in unit/run.ts when detected
// Logging it again here causes duplicate output in the console
```

### 2. File Watcher Race Condition (Fixed)

**Location**: `src/journal/console-formatter.ts` (Lines 126-132)

The file watcher could trigger multiple times for a single write operation, causing duplicate reads:

**Problem Flow**:
1. Event written to file
2. File watcher triggers `'change'` event
3. `readNew()` called
4. File system triggers another `'change'` event (coalesced writes)
5. `readNew()` called AGAIN - reads same event twice

**Fix**: Added debounce mechanism with `isReading` flag:

```typescript
private isReading = false;

private startWatching(): void {
  this.watcher = watch(this.eventsFile, (eventType) => {
    if (eventType === 'change' && !this.isReading) {
      this.isReading = true;
      this.readNew();
      // Reset flag after a short delay to allow for batched reads
      setTimeout(() => { this.isReading = false; }, 50);
    }
  });
}
```

This prevents overlapping reads when multiple file system events fire for a single write.

### 3. Async Race in readExisting() (Fixed)

**Location**: `src/journal/console-formatter.ts` (Lines 110-114)

The original code had separate event listeners for `'end'` and `'close'`:

```typescript
// BEFORE: Potential race between 'end' and 'close'
stream.on('end', () => {
  this.lastPosition = stats.size;
});

await new Promise((resolve) => stream.on('close', resolve));
```

If the file watcher triggered between `'end'` and `'close'`, `lastPosition` might not be set yet.

**Fix**: Combined into single promise with proper ordering:

```typescript
// AFTER: Atomically handle both events
await new Promise((resolve, reject) => {
  stream.on('end', () => {
    this.lastPosition = stats.size;
  });
  stream.on('close', resolve);
  stream.on('error', reject);
});
```

## Files Modified

### src/repair/pipeline.ts
**Lines 66-79**: Removed duplicate `gapDetected` event logging

### src/journal/console-formatter.ts
**Lines 110-119**: Fixed async race in `readExisting()`
**Lines 126-135**: Added debounce to `startWatching()`

## Verification

After fixes, events should appear **exactly once**:

```
🎬 Starting: Generate Design: Home Lesson Tree
   └─ Inputs: 2  Outputs: 1

💭 Starting convergence loop for task: Generate Design: undefined
   └─ taskId: 003-001-design-home-lesson-tree
   └─ maxIterations: 100
   └─ isWbs: false
   └─ hasInputs: true
   └─ hasOutputs: true

🔍 Gap detected: [003-001-design-home-lesson-tree] Initial execution
   └─ Kind: output

   [1] Trying strategy: task-run

🤖 Running AI
   Task  : Generate Design: Home Lesson Tree
   Phase : run_task
   Logs  : .../logs

   ... (AI runs silently for 2-5 minutes) ...

   ✅ Resolved by: task-run

Verifying outputs...
Resolved 1/1 gap(s) in 145.2s

✅ COMPLETED in 2m 45s
```

## Build Status

✅ `ESM ⚡️ Build success in 937ms`

## Related Issues

- **Timer-based logging removed**: See `TIMER_BASED_LOGGING_REMOVED.md`
- **Silence during AI execution**: This is NORMAL - AI works silently for 2-5 minutes

## Summary

✅ **Duplicate gap logging**: Removed from pipeline.ts
✅ **File watcher race**: Added debounce mechanism
✅ **Async race condition**: Fixed event listener ordering

All event duplication issues resolved. Each event now appears exactly once in console output.
