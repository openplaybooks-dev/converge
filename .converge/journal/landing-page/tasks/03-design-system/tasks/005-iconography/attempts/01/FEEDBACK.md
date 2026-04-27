# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ✅ **lucide-installed**
- ❌ **converge-mark-exists**
- ❌ **journey-svg-exists**
- ❌ **icon-component-exists**

## ❌ converge-mark-exists

**Command**: `test -f apps/landing/src/icons/converge-mark.svg && grep -q '<svg' apps/landing/src/icons/converge-mark.svg`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/icons/converge-mark.svg && grep -q '<svg' apps/landing/src/icons/converge-mark.svg
```

## ❌ journey-svg-exists

**Command**: `test -f apps/landing/src/icons/convergence-journey.svg && grep -q '<svg' apps/landing/src/icons/convergence-journey.svg`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/icons/convergence-journey.svg && grep -q '<svg' apps/landing/src/icons/convergence-journey.svg
```

## ❌ icon-component-exists

**Command**: `test -f apps/landing/src/components/ui/Icon.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/ui/Icon.astro
```
