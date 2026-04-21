---
id: 07-refactor-journal
title: Refactor journal system — remove epic paths
blocking: true
dependencies: [06-refactor-storage-checkpoint]
---

Remove epicId from the journal system.

**`packages/core/src/journal/structure.ts`:**
- Remove epicId parameters from getJournalStructure() and related functions
- Delete or rename getEpicTasksDir(), getEpicsDir()
- Update getJournalFilePath(), getTaskBeforeDir(), getTaskAfterDir(), getAncestorJournalPaths(), getBreadcrumbs() — remove epicId params

**`packages/core/src/journal/writer.ts`** (~42 occurrences):
- Remove epicId from write operations

**`packages/core/src/journal/navigator.ts`** (~53 occurrences):
- Remove epic filtering/navigation

**`packages/core/src/journal/re-eval.ts`** (~35 occurrences):
- Remove epic grouping

**`packages/core/src/journal/deps-map.ts`** (~32 occurrences):
- Remove epic task dependencies (if not done in task 05)

**`packages/core/src/journal/types.ts`** (~8 occurrences):
- Remove epicId from journal types

**`packages/core/src/journal/summary-writer.ts`**, **`reader.ts`**, **`api.ts`**, **`session-logger.ts`**:
- Remove remaining epic references
