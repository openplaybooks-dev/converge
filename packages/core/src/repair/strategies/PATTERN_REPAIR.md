# Missing Input Pattern Repair Strategy

## Overview

The `MissingInputPatternRepairStrategy` automatically detects and suggests fixes for glob pattern mismatches in task input declarations.

## Problem

Tasks can fail with "missing inputs" errors even when files exist, if the glob pattern doesn't match the actual file structure:

```yaml
# Task declares:
inputs:
  - ".stitch/designs/*.html"

# But files actually exist at:
.stitch/designs/home-dashboard/design.html
.stitch/designs/lesson-tree/design.html
```

The pattern `.stitch/designs/*.html` expects flat files, but they're nested in subdirectories.

## Solution

This strategy:
1. Detects when a glob pattern in `inputs:` matches zero files
2. Generates pattern variations (deeper/shallower wildcards)
3. Tests variations against the filesystem
4. Suggests corrected pattern if files are found

## Pattern Variations

The strategy tests these variations:

### 1. Deeper Nesting
- `designs/*.html` → `designs/*/*.html`
- `designs/*.html` → `designs/*/design.html`

### 2. Recursive Wildcard
- `designs/*.html` → `designs/**/*.html`

### 3. Shallower Nesting
- `designs/screens/*.html` → `designs/*.html`

### 4. Case Variations
- `assets/Images/*.png` → `assets/images/*.png`

## Integration

Priority: **8.5** (runs between DependencyBackoff and ToolEnvironment)

The strategy is registered in the default pipeline:
```typescript
const strategies = [
  new WBSGeneratorRepairStrategy(),          // 10
  new DependencyBackoffStrategy(),           // 9
  new MissingInputPatternRepairStrategy(),   // 8.5 ← NEW
  new ToolEnvironmentRepairStrategy(),       // 8
  // ...
];
```

## Output

When a mismatch is detected, the strategy returns:
```typescript
{
  success: true,
  reason: 'Pattern mismatch detected...',
  retryMode: 'none', // User must fix SKILL.md
  metadata: {
    patternFix: {
      originalPattern: '.stitch/designs/*.html',
      suggestedPattern: '.stitch/designs/*/design.html',
      matchedFiles: ['...']
    }
  }
}
```

## Example Fix

**Before (incorrect):**
```yaml
inputs:
  - ".stitch/designs/*.html"
```

**After (corrected):**
```yaml
inputs:
  - ".stitch/designs/*/design.html"
```

## Benefits

- **Self-diagnosing**: Automatically identifies pattern syntax issues
- **Educational**: Shows correct pattern for actual file structure
- **Prevents false failures**: Distinguishes pattern issues from missing files
- **Fast**: Only activates when pattern contains wildcards

## Testing

Full test suite in `tests/repair/missing-input-pattern.test.ts` covers:
- Nested directory mismatches
- Recursive wildcard needs
- Case sensitivity
- Shallower pattern needs
- No files exist (delegates to DependencyBackoff)

Run tests:
```bash
pnpm test missing-input-pattern
```
