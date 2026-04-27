# FEEDBACK.md — Check Results

**Status**: ❌ 5/5 check(s) failed

- ❌ **layout-exists**
- ❌ **layout-imports-head**
- ❌ **layout-reads-seo-json**
- ❌ **layout-no-screwfast**
- ❌ **layout-imports-globals**

## ❌ layout-exists

**Command**: `test -f apps/landing/src/layouts/MainLayout.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/layouts/MainLayout.astro
```

## ❌ layout-imports-head

**Command**: `test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "import\s+Head" apps/landing/src/layouts/MainLayout.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "import\s+Head" apps/landing/src/layouts/MainLayout.astro
```

## ❌ layout-reads-seo-json

**Command**: `test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "\.content/seo\.json|seo\.json" apps/landing/src/layouts/MainLayout.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "\.content/seo\.json|seo\.json" apps/landing/src/layouts/MainLayout.astro
```

## ❌ layout-no-screwfast

**Command**: `test -f apps/landing/src/layouts/MainLayout.astro && ! grep -qiE 'screwfast|astrowind|foxi|sitedata|siteData' apps/landing/src/layouts/MainLayout.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/layouts/MainLayout.astro && ! grep -qiE 'screwfast|astrowind|foxi|sitedata|siteData' apps/landing/src/layouts/MainLayout.astro
```

## ❌ layout-imports-globals

**Command**: `test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "globals\.css|tokens\.css" apps/landing/src/layouts/MainLayout.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "globals\.css|tokens\.css" apps/landing/src/layouts/MainLayout.astro
```
