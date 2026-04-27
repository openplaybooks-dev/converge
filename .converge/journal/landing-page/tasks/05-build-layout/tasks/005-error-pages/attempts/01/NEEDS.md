# Needs: 05-build-layout/005-error-pages

## Expected Outputs

- `apps/landing/src/pages/404.astro`

## Checks

- **404-exists**: 404.astro exists
- **404-uses-main-layout**: 404.astro wraps content in MainLayout
- **404-has-home-link**: 404 has a back-to-home link
