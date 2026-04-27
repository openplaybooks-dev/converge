# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ✅ **ia-json-exists**
- ❌ **content-config-exists**
- ❌ **docs-loader-configured**
- ❌ **sidebar-references-ia**

## ❌ content-config-exists

**Command**: `test -f apps/landing/src/content.config.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/content.config.ts
```

## ❌ docs-loader-configured

**Command**: `test -f apps/landing/src/content.config.ts && grep -qE 'docsLoader|docsSchema' apps/landing/src/content.config.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/content.config.ts && grep -qE 'docsLoader|docsSchema' apps/landing/src/content.config.ts
```

## ❌ sidebar-references-ia

**Command**: `test -f apps/landing/astro.config.mjs && grep -qE 'docs/_ia\.json|_ia\.json' apps/landing/astro.config.mjs`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/astro.config.mjs && grep -qE 'docs/_ia\.json|_ia\.json' apps/landing/astro.config.mjs
```
