# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **typecheck-passes**
- ❌ **fix-report-written**

## ❌ typecheck-passes

**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`
**Exit code**: 1
**Output**:
```
Command failed: pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```

## ❌ fix-report-written

**Command**: `test -f .converge/studio-state/typecheck-fix.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/studio-state/typecheck-fix.json
```
