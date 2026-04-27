# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **starlight-in-config**
- ❌ **starlight-installed**

## ❌ starlight-in-config

**Command**: `test -f apps/landing/astro.config.mjs && grep -qE '@astrojs/starlight' apps/landing/astro.config.mjs`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/astro.config.mjs && grep -qE '@astrojs/starlight' apps/landing/astro.config.mjs
```

## ❌ starlight-installed

**Command**: `test -d apps/landing/node_modules/@astrojs/starlight`
**Exit code**: 1
**Output**:
```
Command failed: test -d apps/landing/node_modules/@astrojs/starlight
```
