# Needs: 02-bootstrap-astro/005-cloudflare-adapter

## Inputs

- `apps/landing/.content/brand.json`

## Expected Outputs

- `apps/landing/astro.config.mjs`

## Checks

- **astro-config-exists**: astro.config.mjs exists
- **cloudflare-adapter**: astro.config.mjs imports @astrojs/cloudflare
- **output-server**: output is 'server' (Astro 6 valid value for SSR)
- **site-set**: site is set to https://converge.dev
- **build-clean**: production build succeeds against the bootstrap state
