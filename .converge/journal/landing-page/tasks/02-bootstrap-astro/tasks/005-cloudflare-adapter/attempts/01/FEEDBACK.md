# FEEDBACK.md — Check Results

**Status**: ❌ 1/5 check(s) failed

- ✅ **astro-config-exists**
- ✅ **cloudflare-adapter**
- ❌ **output-server**
- ✅ **site-set**
- ✅ **build-clean**

## ❌ output-server

**Command**: `test -f apps/landing/astro.config.mjs && grep -qE "output:\s*['\"]server['\"]" apps/landing/astro.config.mjs`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/astro.config.mjs && grep -qE "output:\s*['\"]server['\"]" apps/landing/astro.config.mjs
```
