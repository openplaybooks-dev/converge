# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **next-config-exists**
- ❌ **transpile-packages**

## ❌ next-config-exists

**Command**: `test -f packages/studio/next.config.mjs`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/next.config.mjs
```

## ❌ transpile-packages

**Command**: `grep -q 'transpilePackages' packages/studio/next.config.mjs && grep -q '@converge/core' packages/studio/next.config.mjs`
**Exit code**: 2
**Output**:
```
grep: packages/studio/next.config.mjs: No such file or directory
```
