---
id: 003-pagefind-search
title: Enable Pagefind search in Starlight
dependencies: [002-sidebar-from-ia]
inputs:
  - apps/landing/astro.config.mjs
outputs:
  - apps/landing/astro.config.mjs
checks:
  - id: pagefind-enabled
    cmd: "test -f apps/landing/astro.config.mjs && grep -qE 'pagefind:\\s*true' apps/landing/astro.config.mjs"
    description: pagefind is enabled in starlight config
  - id: pagefind-built
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing build && test -d apps/landing/dist/pagefind"
    description: dist/pagefind directory was created by the build
---

# Pagefind search

Starlight ships Pagefind out of the box. Confirm it's enabled and the
build produces the search index.

## Process

In `apps/landing/astro.config.mjs`, the starlight() call should already
have `pagefind: true` (added in 001-starlight-mount). If it doesn't, add it:

```js
starlight({
  title: 'Converge',
  sidebar,
  social: { github: '...' },
  pagefind: true,   // ← this line
}),
```

Then run `pnpm --filter @converge/landing build` and verify
`apps/landing/dist/pagefind/` was created.

## Banned

- Adding a separate search component. Pagefind is integrated into Starlight's UI; nothing more to wire.
- Disabling pagefind. The docs are the bulk of the site; without search the docs are barely usable.
