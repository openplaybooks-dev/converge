# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ❌ **blog-collection-defined**
- ❌ **schema-uses-zod**
- ❌ **blog-content-dir-exists**
- ✅ **build-still-clean**

## ❌ blog-collection-defined

**Command**: `test -f apps/landing/src/content.config.ts && grep -qE 'blog\s*:\s*defineCollection' apps/landing/src/content.config.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/content.config.ts && grep -qE 'blog\s*:\s*defineCollection' apps/landing/src/content.config.ts
```

## ❌ schema-uses-zod

**Command**: `test -f apps/landing/src/content.config.ts && grep -qE 'z\.string|z\.coerce\.date|z\.array' apps/landing/src/content.config.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/content.config.ts && grep -qE 'z\.string|z\.coerce\.date|z\.array' apps/landing/src/content.config.ts
```

## ❌ blog-content-dir-exists

**Command**: `test -d apps/landing/src/content/blog`
**Exit code**: 1
**Output**:
```
Command failed: test -d apps/landing/src/content/blog
```
