# FEEDBACK.md — Check Results

**Status**: ❌ 3/5 check(s) failed

- ❌ **layout-exists**
- ❌ **header-exists**
- ❌ **header-imported-by-layout**
- ✅ **layout-has-no-mc-imports**
- ✅ **typecheck-passes**

## ❌ layout-exists

**Command**: `test -f packages/converge-studio/src/app/layout.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/app/layout.tsx
```

## ❌ header-exists

**Command**: `test -f packages/converge-studio/src/components/layout/converge-header.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/components/layout/converge-header.tsx
```

## ❌ header-imported-by-layout

**Command**: `grep -q 'converge-header' packages/converge-studio/src/app/layout.tsx`
**Exit code**: 2
**Output**:
```
grep: packages/converge-studio/src/app/layout.tsx: No such file or directory
```
