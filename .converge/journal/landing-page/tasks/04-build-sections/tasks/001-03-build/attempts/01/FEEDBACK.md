# FEEDBACK.md — Check Results

**Status**: ❌ 1/5 check(s) failed

- ✅ **component-exists**
- ❌ **component-uses-section-wrapper**
- ✅ **component-typecheck**
- ✅ **no-hardcoded-hex**
- ✅ **no-placeholders**

## ❌ component-uses-section-wrapper

**Command**: `test -f apps/landing/src/components/sections/Hero.astro && grep -qE '<Section\s' apps/landing/src/components/sections/Hero.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/sections/Hero.astro && grep -qE '<Section\s' apps/landing/src/components/sections/Hero.astro
```
