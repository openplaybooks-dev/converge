# Needs: 05-build-layout/002-navigation

## Inputs

- `apps/landing/.content/sitemap.json`
- `apps/landing/.content/brand.json`
- `apps/landing/src/icons/converge-mark.svg`

## Expected Outputs

- `apps/landing/src/components/layout/Header.astro`

## Checks

- **header-exists**: Header.astro exists
- **header-has-converge-mark**: Header references the brand mark / name
- **header-has-docs-link**: Header has a /docs link
- **header-has-github-link**: Header has the GitHub link
