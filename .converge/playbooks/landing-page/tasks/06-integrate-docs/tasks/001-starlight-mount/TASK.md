---
id: 001-starlight-mount
title: Install + register @astrojs/starlight, mount under /docs
inputs:
  - apps/landing/astro.config.mjs
  - apps/landing/.content/brand.json
outputs:
  - apps/landing/astro.config.mjs
checks:
  - id: starlight-in-config
    cmd: "test -f apps/landing/astro.config.mjs && grep -qE '@astrojs/starlight' apps/landing/astro.config.mjs"
    description: astro.config.mjs imports + uses starlight()
  - id: starlight-installed
    cmd: "test -d apps/landing/node_modules/@astrojs/starlight"
    description: "@astrojs/starlight is installed"
---

# Mount Starlight

Add Starlight to `astro.config.mjs` so `/docs/*` routes get the docs UI.

## Process

1. Verify `@astrojs/starlight` is in `apps/landing/package.json` (was installed in phase 02). If not, `pnpm --filter @converge/landing add @astrojs/starlight`.
2. Edit `apps/landing/astro.config.mjs` to add starlight to the integrations array. Resulting shape:

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://converge.dev',
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [
    mdx(),
    sitemap(),
    starlight({
      title: 'Converge',
      // Sidebar comes from docs/_ia.json — see 002-sidebar-from-ia
      sidebar: [],
      social: { github: 'https://github.com/myanlabs/converge' },
      // Mount under /docs
      pagefind: true,
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
```

3. Run `pnpm --filter @converge/landing astro check`. Starlight will warn that no docs are loaded yet — that's expected; 002 sets up the loader.

## Banned

- Mounting Starlight at `/`. The marketing landing owns `/`; Starlight owns `/docs/*`.
- Hardcoding the title here when brand.json has `name`. Use `brand.name` if you can; fallback to literal `'Converge'` is acceptable since Starlight's title prop is required at config time.
