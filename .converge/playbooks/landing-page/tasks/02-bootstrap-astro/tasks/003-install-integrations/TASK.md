---
id: 003-install-integrations
title: Install + configure Astro integrations (Tailwind, MDX, Starlight, Cloudflare, RSS, sitemap)
dependencies: [002-scaffold-fresh]
inputs:
  - apps/landing/package.json
outputs:
  - apps/landing/package.json
checks:
  - id: tailwind-installed
    cmd: "test -f apps/landing/package.json && node -e \"const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit((all['@tailwindcss/vite']||all['@astrojs/tailwind']||all['tailwindcss'])?0:1)\""
    description: tailwindcss (any of the 3 install styles) is in deps
  - id: mdx-installed
    cmd: "test -f apps/landing/package.json && node -e \"const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/mdx']?0:1)\""
    description: "@astrojs/mdx is in deps"
  - id: sitemap-installed
    cmd: "test -f apps/landing/package.json && node -e \"const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/sitemap']?0:1)\""
    description: "@astrojs/sitemap is in deps"
  - id: rss-installed
    cmd: "test -f apps/landing/package.json && node -e \"const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/rss']?0:1)\""
    description: "@astrojs/rss is in deps"
  - id: starlight-installed
    cmd: "test -f apps/landing/package.json && node -e \"const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/starlight']?0:1)\""
    description: "@astrojs/starlight is in deps"
  - id: cloudflare-adapter-installed
    cmd: "test -f apps/landing/package.json && node -e \"const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/cloudflare']?0:1)\""
    description: "@astrojs/cloudflare is in deps"
  - id: install-completed
    cmd: "test -f apps/landing/package.json && test -d apps/landing/node_modules && test -d apps/landing/node_modules/astro"
    description: pnpm install completed and astro is resolvable
---

# Install integrations

Add and install the 6 integrations the playbook needs. Tailwind v4 is
preferred (uses `@tailwindcss/vite`); fall back to `@astrojs/tailwind` if
the project ships Tailwind v3.

## Process

```bash
# From repo root (workspace root)
pnpm --filter @openplaybooks/landing add \
  @astrojs/mdx \
  @astrojs/sitemap \
  @astrojs/rss \
  @astrojs/starlight \
  @astrojs/cloudflare

pnpm --filter @openplaybooks/landing add -D \
  @tailwindcss/vite \
  tailwindcss

# Resolve workspace
pnpm install
```

After this completes:
- `apps/landing/package.json` lists all 7 packages (6 production + Tailwind dev).
- `apps/landing/node_modules/astro/` exists.
- The Cloudflare adapter is registered (configured in 005-cloudflare-adapter).

## Banned

- Running `pnpm install` from inside `apps/landing/`. Always from the workspace root — the workspace install is what stitches `apps/*` to `packages/*`.
- Pinning specific versions. Use the latest stable for each — the verify phase catches version-incompat issues at build time.
- Adding integrations not in the list. The playbook is intentionally minimal; if a section in phase 04 needs an extra integration (e.g. astro-icon), add it in that section's 03-build step, not here.
