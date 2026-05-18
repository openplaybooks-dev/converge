---
id: 02-bootstrap-astro
title: Phase 02 — Bootstrap Astro from scratch (wipe + scaffold + integrations)
blocking: true
dependencies: [01-prepare-spec]
inputs:
  - apps/landing/.content/brand.json
  - apps/landing/.content/sitemap.json
outputs:
  - apps/landing/package.json
  - apps/landing/astro.config.mjs
  - apps/landing/tailwind.config.mjs
  - apps/landing/tsconfig.json
  - apps/landing/src
---

The defining phase. v1's failure was treating a forked theme as the
foundation — leftover demo content was never fully pruned. v2 throws
that out: phase 01-wipe deletes everything in `apps/landing/` except
`package.json`/`node_modules`/`LICENSE`, and 02-scaffold-fresh runs
`npm create astro@latest` to produce a clean foundation. Nothing
inherits from a forked theme. There is no prune phase because there
is nothing to prune.

Five leaf tasks (sequential — each depends on the previous):

1. **001-wipe** — `rm -rf apps/landing/{src,public,astro.config.*,tsconfig.json,.content}`. Keep `package.json` (already wired into the workspace), `node_modules`, `LICENSE`. Verify post-wipe: `apps/landing/src` does not exist.

2. **002-scaffold-fresh** — Run `npm create astro@latest` into a tempdir with a minimal template, then move `src/`, `public/`, `astro.config.*`, `tsconfig.json` into `apps/landing/`. Preserve the existing `package.json#name` (`@openplaybooks/landing`) — overlay only the dependency entries from the scaffold.

3. **003-install-integrations** — Add and configure: `@astrojs/tailwind` (or `@tailwindcss/vite` for v4), `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/rss`, `@astrojs/starlight`, `@astrojs/cloudflare`. Run `pnpm install` from the workspace root.

4. **004-tailwind-init** — `tailwind.config.mjs` with `content: ['./src/**/*.{astro,html,js,ts,md,mdx,svelte,vue,jsx,tsx}']` plus theme tokens read from `apps/landing/.content/brand.json` (palette → `theme.extend.colors`, typography → `theme.extend.fontFamily`). Add `src/styles/globals.css` with `@import "tailwindcss";` and the `@layer base` reset.

5. **005-cloudflare-adapter** — `astro.config.mjs` with `adapter: cloudflare(...)`, `output: 'server'`, `site: 'https://converge.dev'`, integrations array including all of the above.

After this phase: `pnpm --filter @openplaybooks/landing astro check && pnpm --filter @openplaybooks/landing build` should succeed against an empty/placeholder home page (Astro's default `index.astro` is fine — phase 04 replaces it).

The hard check at the end: `grep -rln 'ScrewFast\|AstroWind\|Foxi' apps/landing/src/` MUST be empty.
