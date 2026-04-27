# Checks: 04-build-sections/008-04-integrate

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## index-astro-exists
**Description**: index.astro exists
**Command**: `test -f apps/landing/src/pages/index.astro`

## component-imported
**Description**: CtaBanner is imported in index.astro
**Command**: `test -f apps/landing/src/pages/index.astro && grep -qE "import\s+CtaBanner\s+from" apps/landing/src/pages/index.astro`

## component-rendered
**Description**: <CtaBanner> is rendered in index.astro
**Command**: `test -f apps/landing/src/pages/index.astro && grep -qE '<CtaBanner\b' apps/landing/src/pages/index.astro`

## build-clean
**Description**: astro check still passes after integration
**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing astro check`