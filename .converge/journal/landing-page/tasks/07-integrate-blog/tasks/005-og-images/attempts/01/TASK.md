# Task: 07-integrate-blog/005-og-images

# Per-post OG images

Generate Open Graph card images for each post at build time. Use
`astro-og-canvas` for a balance of quality and simplicity.

## Process

```bash
pnpm --filter @converge/landing add astro-og-canvas
```

Then write:

```ts
// apps/landing/src/pages/og/[slug].png.ts
import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');

const pages = Object.fromEntries(
  posts
    .filter((p) => !p.data.draft)
    .map((p) => [
      p.id.replace(/\.mdx?$/, ''),
      { title: p.data.title, description: p.data.description },
    ]),
);

export const { getStaticPaths, GET } = OGImageRoute({
  pages,
  param: 'slug',
  getImageOptions: (slug, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [[15, 17, 23], [30, 41, 59]],
    border: { color: [99, 102, 241], width: 4, side: 'inline-start' },
    padding: 60,
    font: {
      title: { size: 64, color: [248, 250, 252], weight: 'Bold' },
      description: { size: 28, color: [148, 163, 184], lineHeight: 1.4 },
    },
    logo: { path: './public/favicon.svg', size: [60, 60] },
  }),
});
```

After build, requests to `/og/<slug>.png` return a 1200×630 PNG with
the post title + description on the brand-colored background.

## Banned

- Inline base64 images. Generate per-build, served as PNG.
- Hardcoded brand colors. The `bgGradient` and `border` color values come from `brand.json` palette — if you copy them inline here, sync them to brand.json.