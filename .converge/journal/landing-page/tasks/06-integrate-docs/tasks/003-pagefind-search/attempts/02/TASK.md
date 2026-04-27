# Task: 06-integrate-docs/003-pagefind-search

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