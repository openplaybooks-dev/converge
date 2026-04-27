# Checks: 03-design-system/004-layout-primitives

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## primitives-exist
**Description**: all four layout primitives exist
**Command**: `for f in Container Section Grid Spacer; do test -f apps/landing/src/components/layout/$f.astro || exit 1; done`

## primitives-typecheck
**Description**: astro check has no errors in components/layout
**Command**: `test -d apps/landing/src/components/layout && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*components/layout')`

## section-takes-id-prop
**Description**: Section accepts an id prop (for anchor navigation)
**Command**: `test -f apps/landing/src/components/layout/Section.astro && grep -qE 'id\??:|id:\s*string|Astro\.props' apps/landing/src/components/layout/Section.astro`

## container-max-width
**Description**: Container caps width
**Command**: `test -f apps/landing/src/components/layout/Container.astro && grep -qE 'max-w-' apps/landing/src/components/layout/Container.astro`