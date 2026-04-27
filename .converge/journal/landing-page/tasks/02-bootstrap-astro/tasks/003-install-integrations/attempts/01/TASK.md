# Task: 02-bootstrap-astro/003-install-integrations

# Install integrations

Add and install the 6 integrations the playbook needs. Tailwind v4 is
preferred (uses `@tailwindcss/vite`); fall back to `@astrojs/tailwind` if
the project ships Tailwind v3.

## Process

```bash
# From repo root (workspace root)
pnpm --filter @converge/landing add \
  @astrojs/mdx \
  @astrojs/sitemap \
  @astrojs/rss \
  @astrojs/starlight \
  @astrojs/cloudflare

pnpm --filter @converge/landing add -D \
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