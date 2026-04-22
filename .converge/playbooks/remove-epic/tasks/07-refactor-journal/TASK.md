---
id: 07-refactor-journal
title: Refactor journal system — remove epic paths
blocking: true
dependencies: [06-refactor-storage-checkpoint]
---

Remove epicId from the journal system. Replace with playbookId.

**`packages/core/src/journal/structure.ts`:**
- Remove epicId parameters from getJournalStructure() and related functions
- Delete getEpicTasksDir(), getEpicsDir()
- Add getPlaybookTasksDir(), getPlaybooksDir()
- Update getJournalFilePath(), getTaskBeforeDir(), getTaskAfterDir(), getAncestorJournalPaths(), getBreadcrumbs() — change epicId → playbookId

**`packages/core/src/journal/writer.ts`:**
- Remove epicId from write operations, use playbookId
- Change appendEvent(projectDir, "epic", epicId, ...) → appendEvent(projectDir, "playbook", playbookId, ...)
- Change appendLog(projectDir, "epic", epicId, ...) → appendLog(projectDir, "playbook", playbookId, ...)

**`packages/core/src/journal/navigator.ts`:**
- Remove epic filtering/navigation

**`packages/core/src/journal/re-eval.ts`:**
- Remove epic grouping

**`packages/core/src/journal/deps-map.ts`:**
- Remove epic task dependencies (if not done in task 05)

**`packages/core/src/journal/types.ts`:**
- Remove epicId from journal types, use playbookId

**`packages/core/src/journal/summary-writer.ts`**, **`reader.ts`**, **`api.ts`**, **`session-logger.ts`**:
- Remove remaining epic references, use playbook equivalents
