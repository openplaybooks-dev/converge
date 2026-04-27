# FEEDBACK.md — Check Results

**Status**: ❌ 5/5 check(s) failed

- ❌ **tailwind-config-exists**
- ❌ **globals-css-exists**
- ❌ **globals-imports-tailwind**
- ❌ **tailwind-content-includes-src**
- ❌ **theme-uses-brand-palette**

## ❌ tailwind-config-exists

**Command**: `test -f apps/landing/tailwind.config.mjs`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/tailwind.config.mjs
```

## ❌ globals-css-exists

**Command**: `test -f apps/landing/src/styles/globals.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/globals.css
```

## ❌ globals-imports-tailwind

**Command**: `test -f apps/landing/src/styles/globals.css && grep -qE '@import\s+"tailwindcss"|@tailwind\s+(base|components|utilities)' apps/landing/src/styles/globals.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/globals.css && grep -qE '@import\s+"tailwindcss"|@tailwind\s+(base|components|utilities)' apps/landing/src/styles/globals.css
```

## ❌ tailwind-content-includes-src

**Command**: `test -f apps/landing/tailwind.config.mjs && grep -qE "src/.*astro|src/.*\\{astro" apps/landing/tailwind.config.mjs`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/tailwind.config.mjs && grep -qE "src/.*astro|src/.*\\{astro" apps/landing/tailwind.config.mjs
```

## ❌ theme-uses-brand-palette

**Command**: `test -f apps/landing/tailwind.config.mjs && test -f apps/landing/.content/brand.json && grep -qE 'indigo|6366F1' apps/landing/tailwind.config.mjs`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/tailwind.config.mjs && test -f apps/landing/.content/brand.json && grep -qE 'indigo|6366F1' apps/landing/tailwind.config.mjs
```
