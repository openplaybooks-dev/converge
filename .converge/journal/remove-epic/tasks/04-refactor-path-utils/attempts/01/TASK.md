# Task: 04-refactor-path-utils

Refactor `packages/core/src/unit/path-utils.ts` to remove all epic path resolution.

**Delete these functions:**
- `extractEpicId()` — replace callers with `extractPlaybookId()`
- `extractEpicDir()` — replace callers with playbook-root-based path

**Add new function:**
```typescript
export function extractPlaybookId(taskPath: string): string {
  // Extract playbook name from path: .../playbooks/{name}/...
  const parts = taskPath.split(path.sep).join("/").split("/");
  const idx = parts.indexOf("playbooks");
  if (idx !== -1 && idx + 1 < parts.length) {
    return parts[idx + 1];
  }
  throw new Error(`Invalid task path (no 'playbooks' directory): ${taskPath}`);
}
```

**In `extractJournalTaskId()`:**
- Remove the entire `epics` branch (the `epicsIndex` path)
- Keep only the `playbooks` branch
- Update error message for missing playbooks dir

**In `constructJournalPath()`:**
- Remove the entire `epics` branch
- Keep only the `playbooks` branch
- Update error message

**In `extractLeafTaskId()`:**
- Remove the fallback path that scans for epics
- Keep only the playbooks path

Update doc comments throughout to remove all epic references.

Also refactor `packages/core/src/unit/task-context.ts`:
- Replace `epicId` field with `playbookId`
- Replace `extractEpicId` calls with `extractPlaybookId`
- Remove any `getEpicIdFromContext()` helper