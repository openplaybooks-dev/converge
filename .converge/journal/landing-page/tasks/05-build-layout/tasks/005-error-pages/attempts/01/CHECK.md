# Checks: 05-build-layout/005-error-pages

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## 404-exists
**Description**: 404.astro exists
**Command**: `test -f apps/landing/src/pages/404.astro`

## 404-uses-main-layout
**Description**: 404.astro wraps content in MainLayout
**Command**: `test -f apps/landing/src/pages/404.astro && grep -qE 'MainLayout' apps/landing/src/pages/404.astro`

## 404-has-home-link
**Description**: 404 has a back-to-home link
**Command**: `test -f apps/landing/src/pages/404.astro && grep -qE 'href="/"' apps/landing/src/pages/404.astro`