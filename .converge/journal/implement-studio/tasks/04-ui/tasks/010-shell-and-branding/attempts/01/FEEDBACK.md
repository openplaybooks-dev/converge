# FEEDBACK.md — Check Results

**Status**: ❌ 1/4 check(s) failed

- ✅ **layout-exists**
- ✅ **no-mc-banners**
- ✅ **converge-metadata**
- ❌ **typecheck-passes**

## ❌ typecheck-passes

**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`
**Exit code**: 1
**Output**:
```
Command failed: pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```
