# Needs: 02-bootstrap-astro/003-install-integrations

## Inputs

- `apps/landing/package.json`

## Expected Outputs

- `apps/landing/package.json`

## Checks

- **tailwind-installed**: tailwindcss (any of the 3 install styles) is in deps
- **mdx-installed**: @astrojs/mdx is in deps
- **sitemap-installed**: @astrojs/sitemap is in deps
- **rss-installed**: @astrojs/rss is in deps
- **starlight-installed**: @astrojs/starlight is in deps
- **cloudflare-adapter-installed**: @astrojs/cloudflare is in deps
- **install-completed**: pnpm install completed and astro is resolvable
