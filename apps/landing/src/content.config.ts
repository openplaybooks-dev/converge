// @ts-check
import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
    }),
  }),
};