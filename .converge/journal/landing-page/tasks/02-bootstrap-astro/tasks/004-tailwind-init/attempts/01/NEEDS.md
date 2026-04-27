# Needs: 02-bootstrap-astro/004-tailwind-init

## Inputs

- `apps/landing/.content/brand.json`

## Expected Outputs

- `apps/landing/tailwind.config.mjs`
- `apps/landing/src/styles/globals.css`

## Checks

- **tailwind-config-exists**: tailwind.config.mjs exists
- **globals-css-exists**: src/styles/globals.css exists
- **globals-imports-tailwind**: globals.css imports tailwind (v3 @tailwind or v4 @import)
- **tailwind-content-includes-src**: tailwind.config content paths include src/**/*.astro
- **theme-uses-brand-palette**: tailwind theme references brand palette colors
