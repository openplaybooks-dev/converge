# Checks: 05-build-layout/003-footer

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## footer-exists
**Description**: Footer.astro exists
**Command**: `test -f apps/landing/src/components/layout/Footer.astro`

## footer-has-brand-name
**Description**: Footer mentions the brand name
**Command**: `test -f apps/landing/src/components/layout/Footer.astro && grep -qE 'Converge' apps/landing/src/components/layout/Footer.astro`

## footer-has-license
**Description**: Footer mentions the MIT license
**Command**: `test -f apps/landing/src/components/layout/Footer.astro && grep -qE 'MIT' apps/landing/src/components/layout/Footer.astro`

## footer-no-screwfast
**Description**: no upstream-theme references
**Command**: `test -f apps/landing/src/components/layout/Footer.astro && ! grep -qiE 'screwfast|astrowind|foxi' apps/landing/src/components/layout/Footer.astro`