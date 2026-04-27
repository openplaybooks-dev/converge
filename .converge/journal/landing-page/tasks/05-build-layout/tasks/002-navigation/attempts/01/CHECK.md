# Checks: 05-build-layout/002-navigation

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## header-exists
**Description**: Header.astro exists
**Command**: `test -f apps/landing/src/components/layout/Header.astro`

## header-has-converge-mark
**Description**: Header references the brand mark / name
**Command**: `test -f apps/landing/src/components/layout/Header.astro && grep -qE 'converge-mark|Converge' apps/landing/src/components/layout/Header.astro`

## header-has-docs-link
**Description**: Header has a /docs link
**Command**: `test -f apps/landing/src/components/layout/Header.astro && grep -qE 'href="/docs|href="/docs/' apps/landing/src/components/layout/Header.astro`

## header-has-github-link
**Description**: Header has the GitHub link
**Command**: `test -f apps/landing/src/components/layout/Header.astro && grep -qE 'github\.com/myanlabs/converge' apps/landing/src/components/layout/Header.astro`