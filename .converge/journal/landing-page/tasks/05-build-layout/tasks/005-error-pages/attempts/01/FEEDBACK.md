# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **404-exists**
- ❌ **404-uses-main-layout**
- ❌ **404-has-home-link**

## ❌ 404-exists

**Command**: `test -f apps/landing/src/pages/404.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/404.astro
```

## ❌ 404-uses-main-layout

**Command**: `test -f apps/landing/src/pages/404.astro && grep -qE 'MainLayout' apps/landing/src/pages/404.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/404.astro && grep -qE 'MainLayout' apps/landing/src/pages/404.astro
```

## ❌ 404-has-home-link

**Command**: `test -f apps/landing/src/pages/404.astro && grep -qE 'href="/"' apps/landing/src/pages/404.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/404.astro && grep -qE 'href="/"' apps/landing/src/pages/404.astro
```
