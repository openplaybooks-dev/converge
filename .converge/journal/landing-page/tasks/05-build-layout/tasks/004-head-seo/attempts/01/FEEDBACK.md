# FEEDBACK.md — Check Results

**Status**: ❌ 5/5 check(s) failed

- ❌ **head-exists**
- ❌ **head-emits-title**
- ❌ **head-emits-og**
- ❌ **head-emits-twitter**
- ❌ **head-emits-canonical**

## ❌ head-exists

**Command**: `test -f apps/landing/src/components/layout/Head.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Head.astro
```

## ❌ head-emits-title

**Command**: `test -f apps/landing/src/components/layout/Head.astro && grep -qE '<title>' apps/landing/src/components/layout/Head.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Head.astro && grep -qE '<title>' apps/landing/src/components/layout/Head.astro
```

## ❌ head-emits-og

**Command**: `test -f apps/landing/src/components/layout/Head.astro && grep -qE 'og:title|og:description|og:image' apps/landing/src/components/layout/Head.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Head.astro && grep -qE 'og:title|og:description|og:image' apps/landing/src/components/layout/Head.astro
```

## ❌ head-emits-twitter

**Command**: `test -f apps/landing/src/components/layout/Head.astro && grep -qE 'twitter:card' apps/landing/src/components/layout/Head.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Head.astro && grep -qE 'twitter:card' apps/landing/src/components/layout/Head.astro
```

## ❌ head-emits-canonical

**Command**: `test -f apps/landing/src/components/layout/Head.astro && grep -qE 'rel="canonical"' apps/landing/src/components/layout/Head.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Head.astro && grep -qE 'rel="canonical"' apps/landing/src/components/layout/Head.astro
```
