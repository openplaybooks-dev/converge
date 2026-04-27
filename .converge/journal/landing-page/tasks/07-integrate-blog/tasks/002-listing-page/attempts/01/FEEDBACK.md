# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **blog-index-exists**
- ❌ **blog-index-uses-getCollection**
- ❌ **blog-index-uses-mainlayout**

## ❌ blog-index-exists

**Command**: `test -f apps/landing/src/pages/blog/index.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/blog/index.astro
```

## ❌ blog-index-uses-getCollection

**Command**: `test -f apps/landing/src/pages/blog/index.astro && grep -qE 'getCollection.*blog' apps/landing/src/pages/blog/index.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/blog/index.astro && grep -qE 'getCollection.*blog' apps/landing/src/pages/blog/index.astro
```

## ❌ blog-index-uses-mainlayout

**Command**: `test -f apps/landing/src/pages/blog/index.astro && grep -qE 'MainLayout' apps/landing/src/pages/blog/index.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/blog/index.astro && grep -qE 'MainLayout' apps/landing/src/pages/blog/index.astro
```
