# Reset Command Documentation

The `harness reset` command removes journals and optionally WBS-generated tasks to allow clean re-execution.

## Overview

The reset command allows you to "undo" completed or failed tasks so they can be re-executed from scratch. This is useful for:

- **Debugging**: Re-run a task after fixing issues
- **Iteration**: Re-generate outputs with improved prompts
- **Cleanup**: Remove dynamically-generated WBS tasks
- **Fresh Start**: Reset entire project to initial state

## Basic Usage

### Reset a Single Task

```bash
# Reset task (removes journal, keeps outputs and WBS tasks)
harness reset 003-generate-html-designs

# Task will re-run on next `harness run`
```

### Reset Multiple Tasks

```bash
harness reset 001-gather-idea 002-generate-design --all
```

### Reset with Options

```bash
# Delete output files too
harness reset 003-generate-html-designs --outputs

# Delete WBS-generated task files
harness reset 003-generate-html-designs --wbs

# Full reset (journal + WBS + outputs)
harness reset 003-generate-html-designs --all
```

### Reset Entire Project

```bash
# WARNING: Deletes all journals, checkpoints, and WBS tasks
harness reset --all
```

## What Gets Reset

### Default Behavior (no flags)

When you run `harness reset <taskId>`:

1. **Checkpoint Cleanup**
   - Removes task from `completedTasks` array
   - Removes task from `failedTasks` array
   - Removes task from `seededTasks` array
   - Removes task from `lockedTasks` array

2. **Journal Cleanup**
   - Deletes entire task journal directory: `.harness/journal/epics/{epicId}/tasks/{taskId}/`
   - Includes all WBS children journals (nested tasks)
   - Includes all attempt logs and status files

3. **Preserves**
   - Task definition files (`.harness/epics/{epicId}/{taskId}/SKILL.md` or `task.ts`)
   - WBS-generated task files (`.harness/epics/{epicId}/{taskId}/task/`)
   - Output files (e.g., `.stitch/designs/*.html`)

### With `--outputs` Flag

Additionally deletes:
- All output files declared in `outputs: [...]`
- WBS output directories
- Glob-matched output files

```bash
harness reset 003-generate-html-designs --outputs
# Deletes: .stitch/designs/home-lesson-tree.html
# Deletes: .stitch/designs/lesson-quiz.html
# Deletes: .stitch/designs/progress-dashboard.html
```

### With `--wbs` Flag

Additionally deletes:
- WBS-generated task files in `.harness/epics/{epicId}/{taskId}/task/`
- All dynamically-spawned subtask definitions

```bash
harness reset 003-generate-html-designs --wbs
# Deletes: .harness/epics/02-prepare-designs/003-generate-html-designs/task/
#          ├── 003-001-design-home-lesson-tree/SKILL.md
#          ├── 003-002-design-lesson-quiz/SKILL.md
#          └── 003-003-design-progress-dashboard/SKILL.md
```

**Use Case:** Parent task with WBS will re-spawn children on next run.

### With `--all` Flag (Full Reset)

Equivalent to `--outputs --wbs`:
- Removes journals
- Removes WBS-generated tasks
- Removes output files

```bash
harness reset 003-generate-html-designs --all
# Complete reset - task will regenerate everything from scratch
```

### Project-Wide Reset

```bash
harness reset --all
```

Deletes:
- Entire `.harness/journal/` directory (all epics, all tasks)
- All WBS-generated task files across all epics
- Recreates empty journal structure
- Creates fresh checkpoint with `iteration: 0`

**WARNING:** This is a destructive operation. Consider backing up your project first.

## Examples

### Example 1: Debugging a Failed Task

```bash
# Task failed, fix the issue in code, then reset
harness reset 001-implement-design-system

# Re-run
harness run --step
```

### Example 2: Re-generate WBS Children

```bash
# Parent task spawned incorrect children
# Full reset to regenerate from scratch
harness reset 002-generate-screen-prompts --all

# Next run will re-spawn children based on updated logic
harness run
```

### Example 3: Update Design Outputs

```bash
# Design system changed, regenerate all HTML designs
harness reset 003-generate-html-designs --outputs

# Keeps WBS task definitions, regenerates HTML files
harness run
```

### Example 4: Fix WBS Logic

```bash
# Parent task's WBS function has a bug
# Delete generated children so parent can re-spawn
harness reset 003-generate-html-designs --wbs

# Parent will re-execute WBS function and spawn new children
harness run
```

### Example 5: Fresh Start

```bash
# Reset entire project to beginning
harness reset --all

# Start from iteration 0
harness run
```

## Task ID Formats

The reset command accepts multiple task ID formats:

```bash
# Just the task ID (leaf name)
harness reset 003-generate-html-designs

# With epic prefix (slash-separated)
harness reset 02-prepare-designs/003-generate-html-designs

# Journal task ID (for WBS children)
harness reset 003-generate-html-designs/003-001-design-home-lesson-tree
```

The command will automatically find the correct journal directory.

## What Happens on Next Run

After resetting a task:

1. **Task Not Found in Checkpoint**
   - `findNextTask()` returns the reset task as next to execute

2. **No Journal Entry**
   - Task executes fresh without prior attempt history

3. **WBS Re-execution** (if `--wbs` was used)
   - Parent task re-runs WBS function
   - Spawns children dynamically
   - Children are written to disk again

4. **Output Re-generation** (if `--outputs` was used)
   - Task re-generates output files from scratch
   - Uses current code/prompts (picks up any fixes)

## Dependency Handling

**IMPORTANT:** Resetting a task does NOT automatically reset its dependents.

If task A depends on task B, and you reset task B:
- Task B will re-run
- Task A will NOT automatically re-run (it's still marked complete)
- If task B produces different outputs, task A may have stale inputs

**Solution:** Reset dependent tasks too:

```bash
# Reset upstream task
harness reset 001-generate-design-system --outputs

# Also reset downstream tasks that depend on it
harness reset 002-generate-screen-prompts --outputs
harness reset 003-generate-html-designs --outputs
harness reset 001-implement-design-system --outputs
```

Or use `--all` for project-wide reset.

## Safety Considerations

### Backup Before Major Resets

```bash
# Create backup before project-wide reset
cp -r .harness/journal .harness/journal.backup
harness reset --all
```

### Incremental Resets

Instead of `--all`, reset specific tasks:

```bash
# Safer: Reset only what changed
harness reset 003-generate-html-designs --wbs
```

### Check Before Deleting Outputs

```bash
# Reset without --outputs first (preview)
harness reset 003-generate-html-designs

# If task re-runs successfully, add --outputs
harness reset 003-generate-html-designs --outputs
```

### Git Integration

WBS-generated files are typically gitignored:

```gitignore
# .gitignore
.harness/journal/
.harness/epics/*/task/  # WBS-generated tasks
```

This means:
- Resetting is safe (files are not in git)
- Can regenerate from source of truth
- No merge conflicts from dynamic files

## Troubleshooting

### Task Not Found

```
ℹ️  Not found in checkpoint (already unlocked)
ℹ️  No journal directory found
```

**Cause:** Task was never completed or already reset.

**Solution:** Just run `harness run` to execute the task.

### Task Still Completed After Reset

**Possible Causes:**
1. Wrong task ID (check with `harness tree`)
2. Task ID doesn't match journal structure
3. Checkpoint not saving correctly

**Debug:**
```bash
# Check checkpoint
harness checkpoint

# Check tree (shows completed status)
harness tree

# Try full path
harness reset 02-prepare-designs/003-generate-html-designs
```

### WBS Children Not Deleted

**Cause:** Used `reset` without `--wbs` flag.

**Solution:**
```bash
harness reset 003-generate-html-designs --wbs
```

### Outputs Still Present

**Cause:** Used `reset` without `--outputs` flag.

**Solution:**
```bash
harness reset 003-generate-html-designs --outputs
```

## Command Reference

```
harness reset <taskId> [taskId...] [OPTIONS]
harness reset --all

OPTIONS:
  --outputs     Delete task output files
  --wbs         Delete WBS-generated task files
  --all         Full reset (--outputs + --wbs)
  --dir=PATH    Project directory (default: current directory)
  --verbose     Show detailed logging

EXAMPLES:
  harness reset 003-generate-html-designs
  harness reset 003-generate-html-designs --outputs
  harness reset 003-generate-html-designs --wbs
  harness reset 003-generate-html-designs --all
  harness reset 001-task 002-task --all
  harness reset --all
```

## Comparison with Other Commands

| Command | Purpose | Journal | WBS Tasks | Outputs |
|---------|---------|---------|-----------|---------|
| `reset <taskId>` | Unlock task | ✅ Delete | ❌ Keep | ❌ Keep |
| `reset <taskId> --outputs` | Reset + delete outputs | ✅ Delete | ❌ Keep | ✅ Delete |
| `reset <taskId> --wbs` | Reset + delete WBS | ✅ Delete | ✅ Delete | ❌ Keep |
| `reset <taskId> --all` | Full task reset | ✅ Delete | ✅ Delete | ✅ Delete |
| `reset --all` | Project reset | ✅ Delete All | ✅ Delete All | ❌ Keep |

## Best Practices

1. **Use `--all` for complete resets** when task logic changed significantly
2. **Use `--wbs` when WBS function changed** to re-spawn children
3. **Use `--outputs` when prompts/code changed** to regenerate artifacts
4. **Reset upstream dependencies** when outputs change
5. **Backup before `reset --all`** (project-wide reset is destructive)
6. **Check with `--step` first** before running full autonomous loop
7. **Use `harness tree`** to verify reset worked (task shows as pending)

## Related Commands

- `harness tree` — View task status (completed, failed, blocked)
- `harness checkpoint` — View checkpoint state
- `harness run --step` — Run single iteration (good for testing after reset)
- `harness status` — Show project progress
