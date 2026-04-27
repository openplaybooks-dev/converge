# Checks: 02-bootstrap-astro/001-wipe

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## src-removed
**Description**: apps/landing/src no longer exists (apps/landing dir intact, src wiped)
**Command**: `test -d apps/landing && test ! -d apps/landing/src`

## astro-config-removed
**Description**: no astro.config remains (apps/landing dir intact, configs wiped)
**Command**: `test -d apps/landing && test ! -f apps/landing/astro.config.mjs && test ! -f apps/landing/astro.config.ts && test ! -f apps/landing/astro.config.js`

## package-json-kept
**Description**: package.json was preserved
**Command**: `test -f apps/landing/package.json`

## package-name-correct
**Description**: package.json#name is still @converge/landing
**Command**: `test -f apps/landing/package.json && node -e "process.exit(require('./apps/landing/package.json').name === '@converge/landing' ? 0 : 1)"`

## wipe-marker
**Description**: .wiped marker file exists (so the next task knows the wipe ran)
**Command**: `test -f apps/landing/.wiped`