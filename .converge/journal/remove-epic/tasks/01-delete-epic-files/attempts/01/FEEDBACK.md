# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **epic-manager-gone**
- ❌ **epic-context-gone**
- ❌ **epic-scanner-gone**
- ❌ **epic-checkpoints-gone**

## ❌ epic-manager-gone

**Command**: `test ! -f packages/core/src/runtime/epic-manager.ts`
**Exit code**: 1
**Output**:
```
Command failed: test ! -f packages/core/src/runtime/epic-manager.ts
```

## ❌ epic-context-gone

**Command**: `test ! -f packages/core/src/context/epic-context.ts`
**Exit code**: 1
**Output**:
```
Command failed: test ! -f packages/core/src/context/epic-context.ts
```

## ❌ epic-scanner-gone

**Command**: `test ! -f packages/core/src/planning/epic-scanner.ts`
**Exit code**: 1
**Output**:
```
Command failed: test ! -f packages/core/src/planning/epic-scanner.ts
```

## ❌ epic-checkpoints-gone

**Command**: `test ! -f packages/core/src/checkpoint/ensure-epic-checkpoints.ts`
**Exit code**: 1
**Output**:
```
Command failed: test ! -f packages/core/src/checkpoint/ensure-epic-checkpoints.ts
```
