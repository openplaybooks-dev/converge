# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **animations-css-exists**
- ❌ **section-uses-reveal-class**
- ❌ **respects-reduced-motion**

## ❌ animations-css-exists

**Command**: `test -f apps/landing/src/styles/animations.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/animations.css
```

## ❌ section-uses-reveal-class

**Command**: `test -f apps/landing/src/components/layout/Section.astro && grep -qE 'reveal-on-scroll|fade-in-up|data-reveal' apps/landing/src/components/layout/Section.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Section.astro && grep -qE 'reveal-on-scroll|fade-in-up|data-reveal' apps/landing/src/components/layout/Section.astro
```

## ❌ respects-reduced-motion

**Command**: `test -f apps/landing/src/styles/animations.css && grep -qE 'prefers-reduced-motion' apps/landing/src/styles/animations.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/animations.css && grep -qE 'prefers-reduced-motion' apps/landing/src/styles/animations.css
```
