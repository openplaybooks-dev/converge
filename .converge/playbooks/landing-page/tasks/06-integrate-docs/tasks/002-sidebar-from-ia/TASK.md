---
id: 002-sidebar-from-ia
title: Build Starlight sidebar from docs/_ia.json + configure docsLoader to read docs/
dependencies: [001-starlight-mount]
inputs:
  - docs/_ia.json
  - docs
outputs:
  - apps/landing/astro.config.mjs
  - apps/landing/src/content.config.ts
checks:
  - id: ia-json-exists
    cmd: "test -f docs/_ia.json"
    description: docs/_ia.json exists (owned by docs playbook)
  - id: content-config-exists
    cmd: "test -f apps/landing/src/content.config.ts"
    description: src/content.config.ts exists
  - id: docs-loader-configured
    cmd: "test -f apps/landing/src/content.config.ts && grep -qE 'docsLoader|docsSchema' apps/landing/src/content.config.ts"
    description: content.config.ts uses docsLoader from Starlight
  - id: sidebar-references-ia
    cmd: "test -f apps/landing/astro.config.mjs && grep -qE 'docs/_ia\\.json|_ia\\.json' apps/landing/astro.config.mjs"
    description: astro.config.mjs imports/reads docs/_ia.json
---

# Sidebar from IA + docsLoader from docs/

Two changes, both about pointing Starlight at the repo's `docs/` directory.

## Change 1: `apps/landing/src/content.config.ts`

```ts
// apps/landing/src/content.config.ts
import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader({
      // Load from the repo's docs/ directory at the workspace root.
      // Skip _internal/ (archive) and _*.json (data files).
      base: '../../docs',
      pattern: '**/*.{md,mdx}',
      // (docsLoader's pattern auto-skips files starting with _)
    }),
    schema: docsSchema(),
  }),
};
```

The `base: '../../docs'` is relative to `apps/landing/` (which is two
levels under the repo root: `apps/landing/` → `apps/` → repo root → `docs/`).

## Change 2: `apps/landing/astro.config.mjs` — sidebar from `docs/_ia.json`

```js
// apps/landing/astro.config.mjs
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
// ... other imports

const ia = JSON.parse(readFileSync(new URL('../../docs/_ia.json', import.meta.url), 'utf-8'));

const sidebar = ia.groups.map((group) => ({
  label: group.label,
  items: group.pages.map((p) => ({
    label: p.title ?? p.slug,
    slug: p.slug,
  })),
}));

export default defineConfig({
  // ... site, output, adapter
  integrations: [
    mdx(),
    sitemap(),
    starlight({
      title: 'Converge',
      sidebar,
      social: { github: 'https://github.com/openplaybooks-dev/converge' },
      pagefind: true,
    }),
  ],
  // ...
});
```

## Process

1. Write `src/content.config.ts` with the docsLoader pointing at `../../docs`.
2. Update `astro.config.mjs` to read `_ia.json` and pass the converted sidebar.
3. Run `pnpm --filter @openplaybooks/landing build`. Verify pages exist at `dist/docs/getting-started/why-converge/index.html` etc.

## Banned

- Copying `docs/` into `apps/landing/`. Starlight reads from the repo-root docs directly. Copying re-introduces the v1 "what's the source of truth" problem.
- Editing `docs/_ia.json` from this playbook. It's owned by the `docs` playbook — read-only here.
- Hardcoding the sidebar shape. If `_ia.json` adds a group, this should pick it up automatically on the next build.
