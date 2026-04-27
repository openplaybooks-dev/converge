# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **paths-module-exists**
- ❌ **typecheck**

## ❌ paths-module-exists

**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/paths.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/converge-adapter/paths.ts
```

## ❌ typecheck

**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`
**Exit code**: 1
**Output**:
```
Command failed: pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```
