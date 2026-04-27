# FEEDBACK.md — Check Results

**Status**: ❌ 2/4 check(s) failed

- ✅ **index-astro-exists**
- ❌ **component-imported**
- ❌ **component-rendered**
- ✅ **build-clean**

## ❌ component-imported

**Command**: `test -f apps/landing/src/pages/index.astro && grep -qE "import\s+Faq\s+from" apps/landing/src/pages/index.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/index.astro && grep -qE "import\s+Faq\s+from" apps/landing/src/pages/index.astro
```

## ❌ component-rendered

**Command**: `test -f apps/landing/src/pages/index.astro && grep -qE '<Faq\b' apps/landing/src/pages/index.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/index.astro && grep -qE '<Faq\b' apps/landing/src/pages/index.astro
```
