# Needs: 05-build-layout/003-footer

## Inputs

- `apps/landing/.content/brand.json`
- `apps/landing/.content/sitemap.json`

## Expected Outputs

- `apps/landing/src/components/layout/Footer.astro`

## Checks

- **footer-exists**: Footer.astro exists
- **footer-has-brand-name**: Footer mentions the brand name
- **footer-has-license**: Footer mentions the MIT license
- **footer-no-screwfast**: no upstream-theme references
