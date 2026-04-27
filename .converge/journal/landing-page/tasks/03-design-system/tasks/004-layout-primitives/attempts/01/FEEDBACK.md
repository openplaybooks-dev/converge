# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **primitives-exist**
- ❌ **primitives-typecheck**
- ❌ **section-takes-id-prop**
- ❌ **container-max-width**

## ❌ primitives-exist

**Command**: `for f in Container Section Grid Spacer; do test -f apps/landing/src/components/layout/$f.astro || exit 1; done`
**Exit code**: 1
**Output**:
```
Command failed: for f in Container Section Grid Spacer; do test -f apps/landing/src/components/layout/$f.astro || exit 1; done
```

## ❌ primitives-typecheck

**Command**: `test -d apps/landing/src/components/layout && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*components/layout')`
**Exit code**: 1
**Output**:
```
Command failed: test -d apps/landing/src/components/layout && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*components/layout')
```

## ❌ section-takes-id-prop

**Command**: `test -f apps/landing/src/components/layout/Section.astro && grep -qE 'id\??:|id:\s*string|Astro\.props' apps/landing/src/components/layout/Section.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Section.astro && grep -qE 'id\??:|id:\s*string|Astro\.props' apps/landing/src/components/layout/Section.astro
```

## ❌ container-max-width

**Command**: `test -f apps/landing/src/components/layout/Container.astro && grep -qE 'max-w-' apps/landing/src/components/layout/Container.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Container.astro && grep -qE 'max-w-' apps/landing/src/components/layout/Container.astro
```
