# Checks: 02-bootstrap-astro/002-scaffold-fresh

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## src-pages-exists
**Description**: src/pages directory exists
**Command**: `test -d apps/landing/src/pages`

## index-astro-exists
**Description**: index.astro exists
**Command**: `test -f apps/landing/src/pages/index.astro`

## astro-config-exists
**Description**: astro.config.mjs exists
**Command**: `test -f apps/landing/astro.config.mjs`

## tsconfig-exists
**Description**: tsconfig.json exists
**Command**: `test -f apps/landing/tsconfig.json`

## no-upstream-brand
**Description**: no forked-theme brand strings anywhere in src/
**Command**: `test -d apps/landing/src && ! grep -rIqE 'ScrewFast|AstroWind|Foxi|AstroPaper|Astroship' apps/landing/src/`

## package-name-still-ours
**Description**: package.json#name is still @converge/landing (overlay didn't clobber)
**Command**: `test -f apps/landing/package.json && node -e "process.exit(require('./apps/landing/package.json').name === '@converge/landing' ? 0 : 1)"`