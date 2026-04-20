# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ❌ **typecheck**
- ✅ **tests**

## ❌ typecheck

**Command**: `cd /Users/minh/Documents/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`
**Exit code**: 1
**Output**:
```
Command failed: cd /Users/minh/Documents/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```
