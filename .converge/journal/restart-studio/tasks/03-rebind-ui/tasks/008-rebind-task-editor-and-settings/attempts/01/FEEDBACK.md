# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **task-editor-exists**
- ❌ **settings-page-exists**

## ❌ task-editor-exists

**Command**: `test -f 'packages/studio/src/app/playbooks/[name]/tasks/by-path/[...path]/page.tsx'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/studio/src/app/playbooks/[name]/tasks/by-path/[...path]/page.tsx'
```

## ❌ settings-page-exists

**Command**: `test -f packages/studio/src/app/settings/page.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/src/app/settings/page.tsx
```
