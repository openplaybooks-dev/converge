# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **image-component-exists**
- ❌ **image-uses-astro-assets**
- ❌ **image-defaults-to-avif-or-webp**
- ❌ **image-defaults-to-lazy**

## ❌ image-component-exists

**Command**: `test -f apps/landing/src/components/ui/Image.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/ui/Image.astro
```

## ❌ image-uses-astro-assets

**Command**: `test -f apps/landing/src/components/ui/Image.astro && grep -qE 'astro:assets' apps/landing/src/components/ui/Image.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/ui/Image.astro && grep -qE 'astro:assets' apps/landing/src/components/ui/Image.astro
```

## ❌ image-defaults-to-avif-or-webp

**Command**: `test -f apps/landing/src/components/ui/Image.astro && grep -qE 'avif|webp' apps/landing/src/components/ui/Image.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/ui/Image.astro && grep -qE 'avif|webp' apps/landing/src/components/ui/Image.astro
```

## ❌ image-defaults-to-lazy

**Command**: `test -f apps/landing/src/components/ui/Image.astro && grep -qE "loading.*lazy|loading=['\"]lazy" apps/landing/src/components/ui/Image.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/ui/Image.astro && grep -qE "loading.*lazy|loading=['\"]lazy" apps/landing/src/components/ui/Image.astro
```
