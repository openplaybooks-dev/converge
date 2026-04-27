# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **og-route-exists**
- ❌ **og-uses-canvas-or-svg**

## ❌ og-route-exists

**Command**: `test -f apps/landing/src/pages/og/[slug].png.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/og/[slug].png.ts
```

## ❌ og-uses-canvas-or-svg

**Command**: `test -f apps/landing/src/pages/og/[slug].png.ts && grep -qE 'astro-og-canvas|sharp|satori|svg' apps/landing/src/pages/og/[slug].png.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/og/[slug].png.ts && grep -qE 'astro-og-canvas|sharp|satori|svg' apps/landing/src/pages/og/[slug].png.ts
```
