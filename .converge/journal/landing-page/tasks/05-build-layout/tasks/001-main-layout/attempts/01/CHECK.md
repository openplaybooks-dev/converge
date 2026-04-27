# Checks: 05-build-layout/001-main-layout

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## layout-exists
**Description**: MainLayout.astro exists
**Command**: `test -f apps/landing/src/layouts/MainLayout.astro`

## layout-imports-head
**Description**: imports Head component
**Command**: `test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "import\s+Head" apps/landing/src/layouts/MainLayout.astro`

## layout-reads-seo-json
**Description**: reads seo.json (directly or via Head)
**Command**: `test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "\.content/seo\.json|seo\.json" apps/landing/src/layouts/MainLayout.astro`

## layout-no-screwfast
**Description**: no upstream-theme references
**Command**: `test -f apps/landing/src/layouts/MainLayout.astro && ! grep -qiE 'screwfast|astrowind|foxi|sitedata|siteData' apps/landing/src/layouts/MainLayout.astro`

## layout-imports-globals
**Description**: imports globals.css (or tokens.css directly)
**Command**: `test -f apps/landing/src/layouts/MainLayout.astro && grep -qE "globals\.css|tokens\.css" apps/landing/src/layouts/MainLayout.astro`