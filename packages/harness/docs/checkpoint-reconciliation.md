# Checkpoint Reconciliation

This document explains the checkpoint reconciliation system that ensures consistency between checkpoint state and filesystem reality.

## Problem Statement

Tasks can sometimes be marked as `failed` in the checkpoint even when they successfully produced all required outputs. This creates inconsistencies where:

1. **Checkpoint says:** Task failed
2. **Filesystem shows:** All required outputs exist
3. **Dependency logic:** Blocks downstream tasks incorrectly

### Root Causes

1. **Race conditions** in checkpoint updates
2. **Error handling bugs** where `unit.run()` returns `true` but checkpoint is marked failed
3. **External modifications** to outputs after task failure
4. **Manual fixes** where user creates missing files outside the harness

## Solution Architecture

### 1. Automatic Reconciliation (Runtime)

**File:** `src/cli/next-task.ts` (lines 356-410)

When `getTaskStates()` scans tasks, it now:

```typescript
// For each task marked as failed:
if (failed.has(taskId) && allOutputsExist) {
  // Remove from failed set
  failed.delete(taskId);
  // Add to completed set
  completed.add(taskId);
  // Update checkpoint asynchronously
  checkpointMgr.reconcileTask(taskId, reason);
}
```

**Benefits:**
- Automatic detection and fix on every `harness run`, `harness gantt`, etc.
- No manual intervention required
- Graceful degradation (async checkpoint update won't block execution)

### 2. Manual Validation Command

**File:** `src/cli/commands-validate.ts`

New command: `pnpm harness validate [--fix]`

**Features:**
- Scans all tasks and compares checkpoint state with filesystem
- Reports inconsistencies grouped by severity (error/warning)
- `--fix` flag auto-reconciles tasks marked failed with all outputs present

**Output Example:**
```
🔍 Validating Checkpoint Consistency

   Scanning 25 tasks...

⚠️  Warnings:
   001-breakdown-ux-to-screens: Marked failed but all required outputs exist
      Expected: .stitch/SITE.md, .stitch/screens.json
      Existing: .stitch/SITE.md, .stitch/screens.json

💡 Run `pnpm harness validate --fix` to auto-fix reconcilable issues.
```

### 3. Checkpoint Manager Enhancement

**File:** `src/checkpoint/manager.ts`

New methods:

```typescript
// Remove task from failed list
async removeFromFailed(taskId: string): Promise<void>

// Reconcile task (move from failed to completed)
async reconcileTask(taskId: string, reason: string): Promise<void>
```

The `reconcileTask()` method:
1. Checks if task is in `failedTasks` but not in `completedTasks`
2. Moves task from `failedTasks` to `completedTasks`
3. Ensures task is in `lockedTasks`
4. Logs the reconciliation for debugging

### 4. Enhanced Task Runner Logging

**File:** `src/lifecycle/task-runner.ts`

When task fails, now logs:
```
❌ Task did not converge
   Task ID: 001-breakdown-ux-to-screens
   Unit.run() returned: false
   isWbsTask: false, isBlocking: true
   Duration: 75379ms, Attempt: 1
   ✓ Checkpoint updated: task marked as failed
```

This helps diagnose false failures where `unit.run()` incorrectly returns `false`.

## Usage

### Automatic (Recommended)

No action needed. The system automatically reconciles on every command:

```bash
pnpm harness run        # Auto-reconciles before execution
pnpm harness gantt      # Auto-reconciles before display
pnpm harness tree       # Auto-reconciles before display
```

### Manual Validation

For explicit validation and batch fixing:

```bash
# Check for inconsistencies
pnpm harness validate

# Auto-fix all reconcilable issues
pnpm harness validate --fix
```

## Validation Rules

### ✅ Reconcilable (Auto-fixable)

**Rule:** Task marked `failed` but all declared outputs exist

**Action:** Move from `failedTasks` to `completedTasks`

**Rationale:** If outputs exist, the task effectively succeeded (even if unit.run() returned false)

### ❌ Not Reconcilable (Manual intervention needed)

**Rule:** Task marked `completed` but outputs missing

**Action:** Report error, require manual investigation

**Rationale:** This indicates a serious issue (file deletion, incorrect output paths, etc.)

## Debug Tools

### Enable Dependency Debugging

```bash
HARNESS_DEBUG_DEPS=true pnpm harness gantt
```

Shows detailed dependency resolution:
```
🔴 Blocking failure detected: 001-breakdown-ux-to-screens
   [Iter 1] Checking 002-generate-design-system dependency on 001-breakdown-ux-to-screens:
     isDepBlocked: false
     isDepFailed: true
     isDepCompleted: false
     → will block: true
```

### Check Raw Checkpoint

```bash
cat .harness/journal/.checkpoint.json | jq '.failedTasks'
```

### Inspect Task Journal

```bash
cat .harness/journal/epics/{epic}/tasks/{task}/checkpoint.json
cat .harness/journal/epics/{epic}/tasks/{task}/attempts.jsonl
```

## Migration Guide

Existing projects with checkpoint inconsistencies will be automatically fixed on the next `harness run` or `harness gantt` execution.

For immediate fix:
```bash
pnpm harness validate --fix
```

## API Reference

### CheckpointManager

```typescript
// New methods
async reconcileTask(taskId: string, reason: string): Promise<void>
async removeFromFailed(taskId: string): Promise<void>

// Existing methods (enhanced)
async markTaskCompleted(taskId: string): Promise<void>  // Now removes from failedTasks
async markTaskFailed(taskId: string): Promise<void>     // Now removes from completedTasks
```

### ValidateCommand

```typescript
interface ValidateOptions {
  dir?: string;     // Project directory (default: cwd)
  fix?: boolean;    // Auto-fix issues (default: false)
}

// Usage
await validateCommand({ fix: true });
```

## Testing

### Reproduce the Issue

1. Manually edit `.harness/journal/.checkpoint.json`
2. Add a task to `failedTasks` that has all outputs
3. Run `pnpm harness validate`
4. Should report warning and suggest `--fix`

### Verify Auto-Reconciliation

1. Create checkpoint inconsistency (as above)
2. Run `pnpm harness gantt`
3. Should auto-reconcile and show warning
4. Task should appear as completed (✓) not failed (✗)

### Test Validation Command

```bash
# Should pass (after reconciliation)
pnpm harness validate
# Output: ✅ No inconsistencies found

# Manually break checkpoint again
# Run with --fix
pnpm harness validate --fix
# Should fix and report
```

## Future Enhancements

1. **Periodic reconciliation job** - Auto-run validation every N iterations
2. **Reconciliation history** - Track all reconciliations in journal
3. **Smart retry** - Auto-retry tasks that were incorrectly marked failed
4. **Output checksums** - Validate output file integrity (not just existence)
5. **Dependency graph visualization** - Show which tasks were blocked by false failures

## Related Files

- `src/cli/next-task.ts` - Output validation and auto-reconciliation
- `src/cli/commands-validate.ts` - Validation command implementation
- `src/checkpoint/manager.ts` - Checkpoint persistence and reconciliation
- `src/lifecycle/task-runner.ts` - Task execution and checkpoint updates

## Support

For issues or questions:
- Check debug logs with `HARNESS_DEBUG_DEPS=true`
- Run `pnpm harness validate` to diagnose
- Inspect journal files in `.harness/journal/`
- File issue with full logs and checkpoint state
