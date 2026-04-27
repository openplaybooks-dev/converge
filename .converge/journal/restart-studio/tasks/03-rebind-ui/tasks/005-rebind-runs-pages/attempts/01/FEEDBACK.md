# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **runs-list-exists**
- ❌ **live-session-view-exists**

## ❌ runs-list-exists

**Command**: `test -f packages/studio/src/app/runs/page.tsx && grep -q 'TableView\|KanbanBoard\|ViewSwitcher' packages/studio/src/app/runs/page.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/src/app/runs/page.tsx && grep -q 'TableView\|KanbanBoard\|ViewSwitcher' packages/studio/src/app/runs/page.tsx
```

## ❌ live-session-view-exists

**Command**: `test -f 'packages/studio/src/app/runs/[playbook]/[sessionId]/page.tsx' && grep -q '/api/runs\|stream\|EventSource' 'packages/studio/src/app/runs/[playbook]/[sessionId]/page.tsx'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/studio/src/app/runs/[playbook]/[sessionId]/page.tsx' && grep -q '/api/runs\|stream\|EventSource' 'packages/studio/src/app/runs/[playbook]/[sessionId]/page.tsx'
```
