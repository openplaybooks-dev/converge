# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **list-page-exists**
- ❌ **new-page-exists**

## ❌ list-page-exists

**Command**: `test -f packages/studio/src/app/playbooks/page.tsx && grep -q 'listPlaybooks\|/api/playbooks' packages/studio/src/app/playbooks/page.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/src/app/playbooks/page.tsx && grep -q 'listPlaybooks\|/api/playbooks' packages/studio/src/app/playbooks/page.tsx
```

## ❌ new-page-exists

**Command**: `test -f packages/studio/src/app/playbooks/new/page.tsx && grep -q '/api/playbooks' packages/studio/src/app/playbooks/new/page.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/src/app/playbooks/new/page.tsx && grep -q '/api/playbooks' packages/studio/src/app/playbooks/new/page.tsx
```
