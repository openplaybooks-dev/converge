# Needs: 06-integrate-docs/001-starlight-mount

## Inputs

- `apps/landing/astro.config.mjs`
- `apps/landing/.content/brand.json`

## Expected Outputs

- `apps/landing/astro.config.mjs`

## Checks

- **starlight-in-config**: astro.config.mjs imports + uses starlight()
- **starlight-installed**: @astrojs/starlight is installed
