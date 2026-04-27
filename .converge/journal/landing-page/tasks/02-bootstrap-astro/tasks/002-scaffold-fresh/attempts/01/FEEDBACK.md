# FEEDBACK.md — Check Results

**Status**: ❌ 5/6 check(s) failed

- ❌ **src-pages-exists**
- ❌ **index-astro-exists**
- ❌ **astro-config-exists**
- ❌ **tsconfig-exists**
- ❌ **no-upstream-brand**
- ✅ **package-name-still-ours**

## ❌ src-pages-exists

**Command**: `test -d apps/landing/src/pages`
**Exit code**: 1
**Output**:
```
Command failed: test -d apps/landing/src/pages
```

## ❌ index-astro-exists

**Command**: `test -f apps/landing/src/pages/index.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/index.astro
```

## ❌ astro-config-exists

**Command**: `test -f apps/landing/astro.config.mjs`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/astro.config.mjs
```

## ❌ tsconfig-exists

**Command**: `test -f apps/landing/tsconfig.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/tsconfig.json
```

## ❌ no-upstream-brand

**Command**: `test -d apps/landing/src && ! grep -rIqE 'ScrewFast|AstroWind|Foxi|AstroPaper|Astroship' apps/landing/src/`
**Exit code**: 1
**Output**:
```
Command failed: test -d apps/landing/src && ! grep -rIqE 'ScrewFast|AstroWind|Foxi|AstroPaper|Astroship' apps/landing/src/
```
