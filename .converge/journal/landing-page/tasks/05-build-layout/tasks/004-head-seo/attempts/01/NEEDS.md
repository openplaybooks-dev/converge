# Needs: 05-build-layout/004-head-seo

## Inputs

- `apps/landing/.content/seo.json`
- `apps/landing/.content/brand.json`

## Expected Outputs

- `apps/landing/src/components/layout/Head.astro`

## Checks

- **head-exists**: Head.astro exists
- **head-emits-title**: emits a <title> tag
- **head-emits-og**: emits Open Graph meta tags
- **head-emits-twitter**: emits Twitter card meta
- **head-emits-canonical**: emits canonical link
