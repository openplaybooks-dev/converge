# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **typecheck**

## ❌ typecheck

**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`
**Exit code**: 1
**Output**:
```
Command failed: pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```
