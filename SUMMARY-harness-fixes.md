# Harness Framework Fixes - Summary

This document summarizes all the fixes made to the harness framework to resolve issues with task execution, dependency blocking, tree display, and WBS task spawning.

## Issues Fixed

### 1. Dependencies Not Loading from SKILL.md Files (CRITICAL)
**File:** `CHANGELOG-dependency-blocking-fix.md`

**Problem:** Tasks defined in SKILL.md had their `dependencies` and `tags` fields ignored, causing the dependency blocking logic to fail completely.

**Fix:** Modified `packages/harness/src/unit/factories.ts` to properly extract `dependencies`, `tags`, and `blocking` fields from SKILL.md frontmatter.

**Impact:** Dependency blocking now works correctly for all task types. Tasks wait for their dependencies to complete before becoming runnable.

---

### 2. Epic Indicators Missing for Running Tasks
**File:** `CHANGELOG-tree-epic-indicator-fix.md`

**Problem:** Epics containing running tasks didn't show the ▶ indicator in the tree view.

**Fix:** Modified `packages/harness/src/cli/tree-display.ts` to include the running task's epic in the `nextEpics` set.

**Impact:** Tree view now correctly shows ▶ indicators on both epics with running tasks and epics with next tasks.

---

### 3. WBS Task Titles Showing "undefined"
**File:** `CHANGELOG-wbs-fixes.md` (Issue 1)

**Problem:** WBS subtasks showed "Generate Prompt: undefined" instead of actual screen names.

**Fix:** Changed `.harness/epics/02-prepare-designs/003-generate-screen-prompts/task.ts` to use `screen.title` instead of `screen.name`.

**Impact:** Task titles now display correctly with actual screen names.

---

### 4. SKILL.md Not Found for WBS Subtasks in Repair System
**File:** `CHANGELOG-wbs-fixes.md` (Issue 2)

**Problem:** Repair system couldn't find SKILL.md files for WBS subtasks stored in `tasks/` subdirectory.

**Fix:** Modified `packages/harness/src/repair/helpers/task.ts` to explicitly check the `tasks/` subdirectory before falling back to recursive search.

**Impact:** Repair strategies now work correctly for WBS subtasks.

---

## Test Coverage

### New Tests Added
1. **Tree Display Tests:**
   - `tests/tree/tree-epic-indicator.test.ts` (4 tests)
   - `tests/tree/tree-display-running-task.test.ts` (2 tests)
   - `tests/tree/tree-next-task-constraint.test.ts` (4 tests)

2. **Path Resolution Tests:**
   - `tests/repair/task-helper-path-resolution.test.ts` (5 tests)

**Total:** 15 new tests, all passing

---

## Files Modified

### Core Framework (packages/harness/)
1. `src/unit/factories.ts` - Fixed SKILL.md dependency loading
2. `src/cli/tree-display.ts` - Fixed epic indicators for running tasks
3. `src/repair/helpers/task.ts` - Fixed path resolution for WBS subtasks
4. `src/tree/task-tree.ts` - Minor debug logging cleanup

### Example Project (artifacts/claude-reactjs/example/)
1. `.harness/epics/02-prepare-designs/003-generate-screen-prompts/task.ts` - Fixed screen.name → screen.title

### Documentation
1. `CHANGELOG-dependency-blocking-fix.md`
2. `CHANGELOG-tree-epic-indicator-fix.md`
3. `CHANGELOG-wbs-fixes.md`
4. `SUMMARY-harness-fixes.md` (this file)

---

## Before vs After

### Tree Display - Before:
```
📊 Tasks: 8  Completed: 0  Running: 1  Failed: 0  Blocked: 3

├── 📂 01-prepare-requirements        ← Missing ▶
│   └── ▶  001-gather-idea-generate-ux
├── ▶  📂 02-prepare-designs           ← WRONG: Should not have ▶
│   ├── ▶  001-breakdown-ux-to-screens ← WRONG: Should be blocked
│   ├── ○  002-generate-design-system
│   ├── 🚫 003-generate-screen-prompts  (blocked)
│   └── 🚫 004-generate-html-designs  (blocked)

▶  Next subtask: .harness/epics/02-prepare-designs/001-breakdown-ux-to-screens
```

### Tree Display - After:
```
📊 Tasks: 8  Completed: 0  Running: 1  Failed: 0  Blocked: 7

├── ▶  📂 01-prepare-requirements      ← Now has ▶
│   └── ▶  001-gather-idea-generate-ux
├── 📂 02-prepare-designs               ← CORRECT: No ▶ (all blocked)
│   ├── 🚫 001-breakdown-ux-to-screens  (blocked)  ← CORRECT
│   ├── 🚫 002-generate-design-system  (blocked)
│   ├── 🚫 003-generate-screen-prompts  (blocked)
│   └── 🚫 004-generate-html-designs  (blocked)

⟳  Parent task executing: .harness/epics/01-prepare-requirements/001-gather-idea-generate-ux
```

### WBS Task Execution - Before:
```
🎬 Starting: Generate Prompt: undefined

[1] Trying strategy: task-definition-repair
❌ Strategy failed: SKILL.md not found for task 003-003-prompt-progress-dashboard

[2] Trying strategy: task-run
✅ Task completed (fallback strategy)
```

### WBS Task Execution - After:
```
🎬 Starting: Generate Prompt: Progress Dashboard

[1] Trying strategy: task-definition-repair
✅ Strategy can now access task definition

[2] Trying strategy: task-run
✅ Task completed
```

---

## Verification

All fixes have been tested and verified:

1. ✅ Dependencies load correctly from SKILL.md files
2. ✅ Dependency blocking works as expected
3. ✅ Tree view shows correct indicators
4. ✅ WBS task titles display properly
5. ✅ Repair system finds SKILL.md files
6. ✅ All 15 new tests pass
7. ✅ No regressions in existing tests (except pre-existing failures)

---

## Next Steps

These fixes provide a solid foundation for the harness framework. Future improvements could include:

1. **Enhanced error messages** - More descriptive errors when dependencies are missing
2. **Better path resolution** - Generalized path resolution for any nesting level
3. **Validation** - Runtime validation of SKILL.md schema fields
4. **Documentation** - Update user docs with WBS best practices

---

## Credits

Fixed by Claude Code on 2026-04-06.
