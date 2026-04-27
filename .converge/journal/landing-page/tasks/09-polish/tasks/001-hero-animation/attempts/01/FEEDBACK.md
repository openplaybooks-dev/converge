# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **animation-component-exists**
- ❌ **animation-respects-reduced-motion**
- ❌ **animation-uses-css-only**

## ❌ animation-component-exists

**Command**: `test -f apps/landing/src/components/animations/ConvergenceJourney.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/animations/ConvergenceJourney.astro
```

## ❌ animation-respects-reduced-motion

**Command**: `test -f apps/landing/src/components/animations/ConvergenceJourney.astro && grep -qE 'prefers-reduced-motion|prefersReducedMotion' apps/landing/src/components/animations/ConvergenceJourney.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/animations/ConvergenceJourney.astro && grep -qE 'prefers-reduced-motion|prefersReducedMotion' apps/landing/src/components/animations/ConvergenceJourney.astro
```

## ❌ animation-uses-css-only

**Command**: `test -f apps/landing/src/components/animations/ConvergenceJourney.astro && ! grep -qE 'addEventListener|requestAnimationFrame|setInterval' apps/landing/src/components/animations/ConvergenceJourney.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/animations/ConvergenceJourney.astro && ! grep -qE 'addEventListener|requestAnimationFrame|setInterval' apps/landing/src/components/animations/ConvergenceJourney.astro
```
