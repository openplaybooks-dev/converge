# Auto-Heal Pattern Mismatch Guide

## Overview

The `MissingInputPatternRepairStrategy` automatically detects and **fixes** glob pattern mismatches in task definitions without manual intervention.

## How Auto-Heal Works

### 1. Detection Phase

When a task fails with "missing inputs", the strategy:

- Checks if the missing input uses a glob pattern (contains `*`)
- Generates pattern variations (deeper/shallower wildcards)
- Tests each variation against the filesystem

### 2. Auto-Fix Phase

When files are found with a corrected pattern:

```typescript
// Example: Task declares this pattern
inputs: [".stitch/designs/*.html"];

// But files actually exist at:
// .stitch/designs/home-dashboard/design.html
// .stitch/designs/lesson-tree/design.html

// Strategy finds: ".stitch/designs/*/design.html" works!
```

The strategy then:

1. **Locates** the task file (SKILL.md or task.ts)
2. **Replaces** the incorrect pattern with the correct one
3. **Logs** the auto-fix event
4. **Returns** `retryMode: 'full'` to retry the task

### 3. Retry Phase

The Converge executor:

- Sees `success: true` and `retryMode: 'full'`
- Reloads the task definition (with fixed pattern)
- Retries task execution
- Task now passes input validation ✅

## Example Auto-Heal Flow

```
┌─────────────────────────────────────────┐
│ Task: 003-generate-svg-assets           │
│ Input: .stitch/designs/*.html           │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Input Validation FAILS                  │
│ ⛔ Missing: .stitch/designs/*.html      │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Gap Detected: missing-dependency        │
│ metadata.missingInputs: [...]           │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Repair Pipeline: MissingInputPattern    │
│ 🔍 Testing pattern variations...        │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ✅ Found 4 files with:                  │
│    .stitch/designs/*/design.html        │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ 🔧 Auto-fixing task.ts...               │
│ Replace pattern in file                 │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ✅ Strategy returns:                    │
│    success: true                        │
│    retryMode: 'full'                    │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Executor retries task with fixed input │
│ ✅ Validation passes                    │
│ ✅ Task executes successfully           │
└─────────────────────────────────────────┘
```

## What Gets Auto-Fixed

The strategy modifies task definition files:

### SKILL.md Files

```yaml
# Before
inputs:
  - ".stitch/designs/*.html"

# After (auto-fixed)
inputs:
  - ".stitch/designs/*/design.html"
```

### task.ts Files

```typescript
// Before
.inputs(['.stitch/designs/*.html'])

// After (auto-fixed)
.inputs(['.stitch/designs/*/design.html'])
```

## Supported Pattern Corrections

### 1. Nested Directory Mismatch

```
❌ .stitch/designs/*.html
✅ .stitch/designs/*/design.html
```

### 2. Recursive Wildcard Needed

```
❌ src/components/*.tsx
✅ src/components/**/*.tsx
```

### 3. Too Deep Nesting

```
❌ .stitch/designs/screens/*.html
✅ .stitch/designs/*.html
```

### 4. Case Sensitivity

```
❌ assets/Images/*.png
✅ assets/images/*.png
```

## Logging

When auto-heal triggers, you'll see:

```
🔍 Checking for glob pattern mismatches...
📐 Testing pattern variations for: .stitch/designs/*.html
✅ Found 4 file(s) with pattern: .stitch/designs/*/design.html (original: .stitch/designs/*.html)
   Files: .stitch/designs/home-dashboard/design.html, ...
🔧 Auto-fixed pattern in: .converge/epics/03-implement-app/003-generate-svg-assets/task.ts
   ".stitch/designs/*.html" → ".stitch/designs/*/design.html"
```

## When Auto-Heal Doesn't Trigger

The strategy will **not** auto-fix if:

1. **No glob patterns** - Pattern doesn't contain `*`
2. **No files found** - No variation matches existing files
   - In this case, delegates to `DependencyBackoffStrategy`
   - Upstream tasks may need to run first
3. **Not a blocker/input gap** - Different gap type
4. **Task file not found** - Neither SKILL.md nor task.ts exists

## Benefits

✅ **Zero Manual Intervention** - Patterns fixed automatically
✅ **Fast Recovery** - Task retries immediately after fix
✅ **Audit Trail** - All fixes logged to journal
✅ **Smart Detection** - Only triggers when files actually exist
✅ **Safe** - Only modifies pattern strings, preserves file structure

## Comparison: Before vs After

### Before (Manual Fix Required)

```
❌ Task fails: Missing input .stitch/designs/*.html
💭 Developer investigates
🔧 Developer manually edits task.ts
🔄 Developer re-runs converge
✅ Task succeeds
⏱️ Time: ~5-10 minutes
```

### After (Auto-Heal)

```
❌ Task fails: Missing input .stitch/designs/*.html
🤖 Strategy detects pattern mismatch
🔧 Strategy auto-fixes task.ts
🔄 Strategy triggers retry
✅ Task succeeds
⏱️ Time: ~2 seconds
```

## Configuration

Auto-heal is **enabled by default** in the repair pipeline.

To disable (not recommended):

```typescript
// In converge config
const strategies = [
  new SeedGeneratorRepairStrategy(),
  new DependencyBackoffStrategy(),
  // new MissingInputPatternRepairStrategy(),  // ← Comment out
  new ToolEnvironmentRepairStrategy(),
  // ...
];
```

## Testing

Run the full test suite:

```bash
cd artifacts/claude-reactjs/converge/packages/core
pnpm test missing-input-pattern
```

All 14 tests should pass ✅

## Troubleshooting

### Pattern not auto-fixed?

Check the journal logs:

```bash
cat .converge/journal/tasks/*/tasks/*/logs/events.jsonl | grep PATTERN
```

Look for:

- `PATTERN_MISMATCH_DETECTED` - Strategy found the issue
- `PATTERN_AUTO_FIXED` - Fix was applied

### Task still fails after fix?

1. Verify the file was modified:

   ```bash
   git diff .converge/epics/*/*/task.ts
   ```

2. Check if pattern is now correct:

   ```bash
   grep "inputs" .converge/epics/*/*/task.ts
   ```

3. Verify files exist:
   ```bash
   ls -la .stitch/designs/*/design.html
   ```

## Future Enhancements

Potential improvements:

- [ ] AI-powered pattern suggestions for complex cases
- [ ] Automatic output pattern correction (not just inputs)
- [ ] Pattern normalization (standardize on one convention)
- [ ] Proactive validation before task execution
- [ ] Batch fix all patterns in project

## Related Documentation

- [Pattern Repair Strategy](./PATTERN_REPAIR.md) - Technical details
- [Repair Pipeline](../README.md) - Full pipeline overview
- [Gap Types](../../gap/types.ts) - Gap classification
