# Clean Path Helpers for Epic Files

## Problem

When epic definitions are inside `epics/2-build-pages/index.js`, using full paths like:

```javascript
.promptFrom('./epics/2-build-pages/prompts/analyze-page.md')
```

is verbose and not intuitive. Users would expect to use relative paths like `./prompts/analyze-page.md`.

## Solution

Use **path helper functions** at the top of each epic's `index.js` file:

```javascript
// Paths relative to .harness/setup/plan/
const EPIC_PATH = './epics/2-build-pages';
const prompt = (file) => `${EPIC_PATH}/prompts/${file}`;
const executor = (file) => `${EPIC_PATH}/executors/${file}`;
```

Then use them throughout the file:

```javascript
.promptFrom(prompt('analyze-page.md'), { ... })
.executeFrom(executor('verify-components.js'), { ... })
```

## Implementation

### 1-bootstrap/index.js

```javascript
/**
 * Bootstrap epic - Install dependencies and fix errors
 */

// Paths relative to .harness/setup/plan/
const EPIC_PATH = './epics/1-bootstrap';
const prompt = (file) => `${EPIC_PATH}/prompts/${file}`;

export function createBootstrapEpic(ctx, input) {
  // ...
  .promptFrom(prompt('install-dependencies.md'))
  .promptFrom(prompt('fix-transpile-error.md'), { ... })
}
```

### 2-build-pages/index.js

```javascript
/**
 * Page epic factory - Deterministic pipeline per page
 */

// Paths relative to .harness/setup/plan/
const EPIC_PATH = './epics/2-build-pages';
const prompt = (file) => `${EPIC_PATH}/prompts/${file}`;
const executor = (file) => `${EPIC_PATH}/executors/${file}`;

function createPageEpic(ctx, input, page) {
  // ...
  .promptFrom(prompt('analyze-page.md'), { ... })
  .promptFrom(prompt('plan-components.md'), { ... })
  .executeFrom(executor('verify-components.js'), { ... })
  .promptFrom(prompt('analyze-animations.md'), { ... })
  .promptFrom(prompt('implement-animations.md'), { ... })
  .executeFrom(executor('verify-page.js'), { ... })
}
```

### 3-integration/index.js

No prompts or executors, so no path helpers needed.

## Benefits

### Before (Verbose)
```javascript
.promptFrom('./epics/2-build-pages/prompts/analyze-page.md', { ... })
.executeFrom('./epics/2-build-pages/executors/verify-components.js', { ... })
```

**Issues:**
- ❌ Long, repetitive paths
- ❌ Not intuitive (not relative to current file)
- ❌ Hard to refactor if epic is renamed
- ❌ Error-prone (easy to mistype full path)

### After (Clean)
```javascript
.promptFrom(prompt('analyze-page.md'), { ... })
.executeFrom(executor('verify-components.js'), { ... })
```

**Benefits:**
- ✅ Short, clean syntax
- ✅ Reads like relative paths
- ✅ Easy to refactor (change once at top)
- ✅ Less error-prone
- ✅ Self-documenting (prompt() = prompts folder)

## Why Not True Relative Paths?

The crew framework resolves paths relative to `.harness/setup/plan/`, not relative to the current file. To support true relative paths like `./prompts/analyze-page.md`, we would need to:

1. Modify the planner to track which epic file is calling `promptFrom()`
2. Resolve paths relative to that file's directory
3. Handle edge cases and maintain backward compatibility

The helper function approach achieves the same goal with:
- ✅ No framework changes needed
- ✅ Clear path resolution (explicit base path)
- ✅ Easy to understand and maintain
- ✅ Works today with existing code

## Pattern for New Epics

When creating a new epic, add path helpers at the top:

```javascript
// In epics/4-new-epic/index.js

// Paths relative to .harness/setup/plan/
const EPIC_PATH = './epics/4-new-epic';
const prompt = (file) => `${EPIC_PATH}/prompts/${file}`;
const executor = (file) => `${EPIC_PATH}/executors/${file}`;

export function createNewEpic(ctx, input) {
  // Use helpers throughout:
  .promptFrom(prompt('my-prompt.md'), { ... })
  .executeFrom(executor('my-executor.js'), { ... })
}
```

## Comparison

| Approach | Syntax | Pros | Cons |
|----------|--------|------|------|
| Full paths | `'./epics/2-build-pages/prompts/file.md'` | Simple, explicit | Verbose, repetitive |
| Helper functions | `prompt('file.md')` | Clean, maintainable | Need to define helpers |
| True relative | `'./prompts/file.md'` | Most intuitive | Requires framework changes |

**Chosen:** Helper functions (best balance)

## Testing

All tests pass with helper function approach:

```
✅ All required files exist
✅ Bootstrap epic: 2/2 prompts working
✅ Build Pages epic: 5/5 prompts working
✅ Integration epic: 0/0 prompts (uses executors)

✅ All consolidated epic tests passed!
```

## Summary

**Before:**
```javascript
.promptFrom('./epics/2-build-pages/prompts/analyze-page.md', {...})
```

**After:**
```javascript
// At top of file
const prompt = (file) => `${EPIC_PATH}/prompts/${file}`;

// In code
.promptFrom(prompt('analyze-page.md'), {...})
```

**Result:**
- 🎯 Clean, readable code
- 📝 Intuitive syntax
- 🔧 Easy to maintain
- ✅ All tests passing
