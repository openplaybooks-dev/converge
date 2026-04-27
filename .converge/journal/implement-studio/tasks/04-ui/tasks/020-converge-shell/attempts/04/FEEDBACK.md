# FEEDBACK.md — Check Results

**Status**: ❌ 3/5 check(s) failed

- ✅ **layout-exists**
- ❌ **header-exists**
- ❌ **header-imported-by-layout**
- ❌ **layout-has-no-mc-imports**
- ✅ **typecheck-passes**

## ❌ header-exists

**Command**: `test -f packages/converge-studio/src/components/layout/converge-header.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/components/layout/converge-header.tsx
```

## ❌ header-imported-by-layout

**Command**: `grep -q 'converge-header' packages/converge-studio/src/app/layout.tsx`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'converge-header' packages/converge-studio/src/app/layout.tsx
```

## ❌ layout-has-no-mc-imports

**Command**: `bash -c 'L=packages/converge-studio/src/app/layout.tsx; ! grep -qE "nav-rail|site-header|live-feed|local-mode-banner|launch|onboarding|fleet|gateway|openclaw" $L'`
**Exit code**: 1
**Output**:
```
Command failed: bash -c 'L=packages/converge-studio/src/app/layout.tsx; ! grep -qE "nav-rail|site-header|live-feed|local-mode-banner|launch|onboarding|fleet|gateway|openclaw" $L'
```
