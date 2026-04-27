# Needs: 05-build-layout/001-main-layout

## Inputs

- `apps/landing/.content/brand.json`
- `apps/landing/.content/seo.json`

## Expected Outputs

- `apps/landing/src/layouts/MainLayout.astro`

## Checks

- **layout-exists**: MainLayout.astro exists
- **layout-imports-head**: imports Head component
- **layout-reads-seo-json**: reads seo.json (directly or via Head)
- **layout-no-screwfast**: no upstream-theme references
- **layout-imports-globals**: imports globals.css (or tokens.css directly)
