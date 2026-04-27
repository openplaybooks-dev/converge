# Checks: 06-integrate-docs/003-pagefind-search

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## pagefind-enabled
**Description**: pagefind is enabled in starlight config
**Command**: `test -f apps/landing/astro.config.mjs && grep -qE 'pagefind:\s*true' apps/landing/astro.config.mjs`

## pagefind-built
**Description**: dist/pagefind directory was created by the build
**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build && test -d apps/landing/dist/client/pagefind`