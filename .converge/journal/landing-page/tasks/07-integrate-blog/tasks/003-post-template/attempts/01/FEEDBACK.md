# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **post-template-exists**
- ❌ **post-uses-getStaticPaths**
- ❌ **post-renders-content**

## ❌ post-template-exists

**Command**: `test -f apps/landing/src/pages/blog/[slug].astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/blog/[slug].astro
```

## ❌ post-uses-getStaticPaths

**Command**: `test -f apps/landing/src/pages/blog/[slug].astro && grep -qE 'getStaticPaths' apps/landing/src/pages/blog/[slug].astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/blog/[slug].astro && grep -qE 'getStaticPaths' apps/landing/src/pages/blog/[slug].astro
```

## ❌ post-renders-content

**Command**: `test -f apps/landing/src/pages/blog/[slug].astro && grep -qE 'render\(\)|<Content\s' apps/landing/src/pages/blog/[slug].astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/blog/[slug].astro && grep -qE 'render\(\)|<Content\s' apps/landing/src/pages/blog/[slug].astro
```
