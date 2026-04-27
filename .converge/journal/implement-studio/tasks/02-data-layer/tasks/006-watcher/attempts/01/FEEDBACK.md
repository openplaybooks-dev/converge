# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **watcher-module-exists**
- ✅ **typecheck**
- ❌ **adapter-public-api**

## ❌ watcher-module-exists

**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/watcher.ts && test -f packages/converge-studio/src/lib/converge-adapter/index.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/converge-adapter/watcher.ts && test -f packages/converge-studio/src/lib/converge-adapter/index.ts
```

## ❌ adapter-public-api

**Command**: `grep -q 'listPlaybooks\|listTasks\|listSessions\|watch' packages/converge-studio/src/lib/converge-adapter/index.ts`
**Exit code**: 2
**Output**:
```
grep: packages/converge-studio/src/lib/converge-adapter/index.ts: No such file or directory
```
