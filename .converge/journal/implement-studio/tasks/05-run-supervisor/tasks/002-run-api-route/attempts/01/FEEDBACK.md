# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **routes-exist**
- ❌ **nodejs-runtime**
- ✅ **typecheck**

## ❌ routes-exist

**Command**: `test -f packages/converge-studio/src/app/api/run/route.ts && test -f 'packages/converge-studio/src/app/api/run/[runId]/stream/route.ts'`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/app/api/run/route.ts && test -f 'packages/converge-studio/src/app/api/run/[runId]/stream/route.ts'
```

## ❌ nodejs-runtime

**Command**: `grep -q "runtime = 'nodejs'" packages/converge-studio/src/app/api/run/route.ts && grep -q "runtime = 'nodejs'" 'packages/converge-studio/src/app/api/run/[runId]/stream/route.ts'`
**Exit code**: 2
**Output**:
```
grep: packages/converge-studio/src/app/api/run/route.ts: No such file or directory
```
