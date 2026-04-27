# Task: 07-integrate-blog/004-rss-feed

# RSS feed

Generate `/rss.xml` listing every non-draft blog post.

## File

```ts
// apps/landing/src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'Converge — Blog',
    description: 'Notes on goal-driven workflows from the Converge team.',
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/blog/${p.id.replace(/\.mdx?$/, '')}`,
      author: p.data.author,
      categories: p.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
```

After build, `dist/rss.xml` will exist with one `<item>` per non-draft post.

## Banned

- Including post bodies in the feed. Description-only keeps the feed lean and respects future paywall/full-text decisions.
- Setting `pubDate` to anything but `data.date`. Drift here breaks feed readers.