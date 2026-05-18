---
id: 001-collection-schema
title: Extend src/content.config.ts with a blog collection schema
inputs:
  - apps/landing/src/content.config.ts
outputs:
  - apps/landing/src/content.config.ts
checks:
  - id: blog-collection-defined
    cmd: "test -f apps/landing/src/content.config.ts && grep -qE 'blog\\s*:\\s*defineCollection' apps/landing/src/content.config.ts"
    description: src/content.config.ts defines a blog collection
  - id: schema-uses-zod
    cmd: "test -f apps/landing/src/content.config.ts && grep -qE 'z\\.string|z\\.coerce\\.date|z\\.array' apps/landing/src/content.config.ts"
    description: schema uses zod fields
  - id: blog-content-dir-exists
    cmd: "test -d apps/landing/src/content/blog"
    description: src/content/blog/ directory exists (empty is fine, seed posts come later)
  - id: build-still-clean
    cmd: "test -f apps/landing/package.json && pnpm --filter @openplaybooks/landing build"
    description: build still passes with the new collection
---

# Blog collection schema

Extend `src/content.config.ts` (created in 06-integrate-docs/002) with
a `blog` collection. After this, the content layer knows about blog
posts even though no posts exist yet.

## File

```ts
// apps/landing/src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
  // Existing docs collection (from phase 06)
  docs: defineCollection({
    loader: docsLoader({ base: '../../docs', pattern: '**/*.{md,mdx}' }),
    schema: docsSchema(),
  }),

  // NEW: blog collection
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: z.object({
      title:       z.string().min(10).max(120),
      description: z.string().min(40).max(220),
      date:        z.coerce.date(),
      author:      z.string().default('Converge Team'),
      tags:        z.array(z.string()).default([]),
      draft:       z.boolean().default(false),
      pinned:      z.boolean().default(false),
      ogImage:     z.string().optional(),
    }),
  }),
};
```

## Process

1. Read the existing `src/content.config.ts` (it has the docs collection).
2. Add the blog collection alongside.
3. Create the directory: `mkdir -p apps/landing/src/content/blog` (the seed posts task will populate it).
4. Run `pnpm --filter @openplaybooks/landing build`. Should succeed (no posts yet, but the collection is registered).

## Banned

- Removing the docs collection. Both collections coexist.
- Schema fields beyond the list above. Keep the front-matter contract minimal — every additional field is one more thing to drift across posts.
