# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **header-exists**
- ❌ **header-has-converge-mark**
- ❌ **header-has-docs-link**
- ❌ **header-has-github-link**

## ❌ header-exists

**Command**: `test -f apps/landing/src/components/layout/Header.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Header.astro
```

## ❌ header-has-converge-mark

**Command**: `test -f apps/landing/src/components/layout/Header.astro && grep -qE 'converge-mark|Converge' apps/landing/src/components/layout/Header.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Header.astro && grep -qE 'converge-mark|Converge' apps/landing/src/components/layout/Header.astro
```

## ❌ header-has-docs-link

**Command**: `test -f apps/landing/src/components/layout/Header.astro && grep -qE 'href="/docs|href="/docs/' apps/landing/src/components/layout/Header.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Header.astro && grep -qE 'href="/docs|href="/docs/' apps/landing/src/components/layout/Header.astro
```

## ❌ header-has-github-link

**Command**: `test -f apps/landing/src/components/layout/Header.astro && grep -qE 'github\.com/myanlabs/converge' apps/landing/src/components/layout/Header.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Header.astro && grep -qE 'github\.com/myanlabs/converge' apps/landing/src/components/layout/Header.astro
```
