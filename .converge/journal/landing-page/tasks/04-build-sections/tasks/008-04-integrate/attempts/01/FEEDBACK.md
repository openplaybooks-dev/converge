# FEEDBACK.md — Check Results

**Status**: ❌ 1/4 check(s) failed

- ✅ **index-astro-exists**
- ✅ **component-imported**
- ❌ **component-rendered**
- ✅ **build-clean**

## ❌ component-rendered

**Command**: `test -f apps/landing/src/pages/index.astro && grep -qE '<CtaBanner\b' apps/landing/src/pages/index.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/index.astro && grep -qE '<CtaBanner\b' apps/landing/src/pages/index.astro
```
