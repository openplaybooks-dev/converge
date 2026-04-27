# Checks: 02-bootstrap-astro/005-cloudflare-adapter

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## astro-config-exists
**Description**: astro.config.mjs exists
**Command**: `test -f apps/landing/astro.config.mjs`

## cloudflare-adapter
**Description**: astro.config.mjs imports @astrojs/cloudflare
**Command**: `test -f apps/landing/astro.config.mjs && grep -q '@astrojs/cloudflare' apps/landing/astro.config.mjs`

## output-server
**Description**: output is 'server' (Astro 6 valid value for SSR)
**Command**: `test -f apps/landing/astro.config.mjs && grep -qE "output:\s*['\"]server['\"]" apps/landing/astro.config.mjs`

## site-set
**Description**: site is set to https://converge.dev
**Command**: `test -f apps/landing/astro.config.mjs && grep -qE "site:\s*['\"]https://converge.dev" apps/landing/astro.config.mjs`

## build-clean
**Description**: production build succeeds against the bootstrap state
**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build`