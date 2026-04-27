---
id: 002-listing-page
title: /blog index page — pinned posts on top, then by date desc
dependencies: [001-collection-schema]
inputs:
  - apps/landing/src/content.config.ts
outputs:
  - apps/landing/src/pages/blog/index.astro
checks:
  - id: blog-index-exists
    cmd: "test -f apps/landing/src/pages/blog/index.astro"
    description: blog/index.astro exists
  - id: blog-index-uses-getCollection
    cmd: "test -f apps/landing/src/pages/blog/index.astro && grep -qE 'getCollection.*blog' apps/landing/src/pages/blog/index.astro"
    description: uses getCollection('blog')
  - id: blog-index-uses-mainlayout
    cmd: "test -f apps/landing/src/pages/blog/index.astro && grep -qE 'MainLayout' apps/landing/src/pages/blog/index.astro"
    description: wraps in MainLayout
---

# Blog listing

`/blog` shows the blog index — pinned posts at top, then posts ordered
by date descending. Drafts are excluded.

## File

```astro
---
// apps/landing/src/pages/blog/index.astro
import { getCollection } from 'astro:content';
import MainLayout from '@/layouts/MainLayout.astro';

const posts = (await getCollection('blog'))
  .filter((p) => !p.data.draft)
  .sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.date.getTime() - a.data.date.getTime();
  });
---

<MainLayout page="blog">
  <section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <h1 class="text-4xl sm:text-5xl font-display font-bold text-text">Blog</h1>
    <p class="mt-3 text-text-muted">
      Notes on goal-driven workflows, comparisons with step-driven frameworks, and lessons from the field.
    </p>

    <ul class="mt-12 space-y-8">
      {posts.map((p) => (
        <li class="border-b border-border pb-8 last:border-b-0">
          <article>
            <a href={`/blog/${p.id.replace(/\.mdx?$/, '')}`} class="group">
              <h2 class="text-2xl font-display font-semibold text-text group-hover:text-indigo transition-colors">
                {p.data.title}
              </h2>
              <p class="mt-2 text-text-muted">{p.data.description}</p>
              <p class="mt-3 text-sm text-text-dim">
                <time datetime={p.data.date.toISOString()}>
                  {p.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
                {p.data.pinned && <span class="ml-3 text-indigo">★ Pinned</span>}
              </p>
            </a>
          </article>
        </li>
      ))}
    </ul>
  </section>
</MainLayout>
```

## Banned

- Loading drafts in production. The filter `!p.data.draft` is non-negotiable.
- Pagination for v1. With < 20 posts, a single scrollable list is the right UX.
