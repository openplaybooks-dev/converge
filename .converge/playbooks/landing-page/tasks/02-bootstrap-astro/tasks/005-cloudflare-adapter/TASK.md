---
id: 005-cloudflare-adapter
title: Configure astro.config.mjs with Cloudflare adapter + integrations
dependencies: [004-tailwind-init]
inputs:
  - apps/landing/.content/brand.json
outputs:
  - apps/landing/astro.config.mjs
checks:
  - id: astro-config-exists
    cmd: "test -f apps/landing/astro.config.mjs"
    description: astro.config.mjs exists
  - id: cloudflare-adapter
    cmd: "test -f apps/landing/astro.config.mjs && grep -q '@astrojs/cloudflare' apps/landing/astro.config.mjs"
    description: astro.config.mjs imports @astrojs/cloudflare
  - id: output-server
    cmd: "test -f apps/landing/astro.config.mjs && grep -qE \"output:\\s*['\\\"]server['\\\"]\" apps/landing/astro.config.mjs"
    description: output is 'server' (Astro 6 valid value for SSR)
  - id: site-set
    cmd: "test -f apps/landing/astro.config.mjs && grep -qE \"site:\\s*['\\\"]https://converge.dev\" apps/landing/astro.config.mjs"
    description: site is set to https://converge.dev
  - id: build-clean
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing build"
    description: production build succeeds against the bootstrap state
---

# Cloudflare adapter

Replace the default `astro.config.mjs` (from the minimal scaffold) with
one that:

- Uses `@astrojs/cloudflare` as the adapter
- Sets `output: 'server'` (Astro 6 — `'hybrid'` was removed)
- Sets `site: 'https://converge.dev'` (canonical production URL)
- Registers `tailwindcss/vite` plugin (Tailwind v4) or `@astrojs/tailwind` (v3)
- Registers `@astrojs/mdx`, `@astrojs/sitemap` integrations
- Leaves Starlight + RSS for later phases (06-integrate-docs and 07-integrate-blog)

## File

```js
// apps/landing/astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://converge.dev',
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [
    mdx(),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

If the project shipped Tailwind v3 via `@astrojs/tailwind`, replace the
`vite.plugins` block with `tailwind()` in `integrations`.

## Process

1. Read `apps/landing/.content/brand.json` (only used here for sanity that the file exists; the config doesn't reference brand directly).
2. Overwrite `apps/landing/astro.config.mjs` with the file above.
3. Run `pnpm --filter @converge/landing build` to verify the bootstrap is clean.
4. The build will produce `apps/landing/dist/` with a placeholder `index.html` — that's fine. Phase 04 builds the real home page.

## Banned

- `output: 'static'` or `output: 'hybrid'`. We need SSR for Cloudflare Pages Functions support; use `'server'`.
- Pinning to a specific Astro version in this config. Versions live in `package.json`.
- Adding integrations not listed above. Starlight and RSS belong to their own phases (06, 07) so the dependency graph stays clear.
