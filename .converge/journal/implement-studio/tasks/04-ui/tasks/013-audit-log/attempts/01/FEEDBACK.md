# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ✅ **audit-page-exists**
- ❌ **audit-uses-runs-api**
- ❌ **typecheck-passes**

## ❌ audit-uses-runs-api

**Command**: `grep -q '/api/runs' packages/converge-studio/src/app/audit/page.tsx`
**Exit code**: 1
**Output**:
```
Command failed: grep -q '/api/runs' packages/converge-studio/src/app/audit/page.tsx
```

## ❌ typecheck-passes

**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`
**Exit code**: 1
**Output**:
```
Command failed: pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```
