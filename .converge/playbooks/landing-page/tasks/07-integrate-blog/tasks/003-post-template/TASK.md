---
id: 003-post-template
title: /blog/[slug] dynamic route — renders MDX posts
dependencies: [002-listing-page]
inputs:
  - apps/landing/src/content.config.ts
outputs:
  - apps/landing/src/pages/blog/[slug].astro
checks:
  - id: post-template-exists
    cmd: "test -f apps/landing/src/pages/blog/[slug].astro"
    description: blog/[slug].astro exists
  - id: post-uses-getStaticPaths
    cmd: "test -f apps/landing/src/pages/blog/[slug].astro && grep -qE 'getStaticPaths' apps/landing/src/pages/blog/[slug].astro"
    description: uses getStaticPaths to enumerate slugs
  - id: post-renders-content
    cmd: "test -f apps/landing/src/pages/blog/[slug].astro && grep -qE 'render\\(\\)|<Content\\s' apps/landing/src/pages/blog/[slug].astro"
    description: renders post content via the entry's render() result
---

# Post template

Dynamic route at `/blog/[slug]` that renders one MDX post.

## File

```astro
---
// apps/landing/src/pages/blog/[slug].astro
import { getCollection, render } from 'astro:content';
import MainLayout from '@/layouts/MainLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts
    .filter((p) => !p.data.draft)
    .map((p) => ({
      params: { slug: p.id.replace(/\.mdx?$/, '') },
      props: { post: p },
    }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<MainLayout
  page="blog"
  title={`${post.data.title} — Converge`}
  description={post.data.description}
  ogImage={post.data.ogImage}
>
  <article class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 prose prose-invert prose-headings:font-display prose-pre:bg-bg-elev">
    <header class="not-prose mb-12">
      <h1 class="text-4xl sm:text-5xl font-display font-bold text-text leading-tight">
        {post.data.title}
      </h1>
      <p class="mt-4 text-text-muted text-lg">{post.data.description}</p>
      <p class="mt-6 text-sm text-text-dim">
        <time datetime={post.data.date.toISOString()}>
          {post.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
        <span class="mx-2">·</span>
        {post.data.author}
      </p>
    </header>

    <Content />

    <footer class="not-prose mt-16 pt-8 border-t border-border">
      <a href="/blog" class="text-indigo hover:underline">← All posts</a>
    </footer>
  </article>
</MainLayout>
```

## Process

1. Write the file.
2. Run `pnpm --filter @openplaybooks/landing build`. With no posts yet, the build won't generate any blog routes — that's expected.
3. After 006-seed-posts runs, the build will generate `dist/blog/<slug>/index.html` for each post.

## Banned

- Inlining post styling. Use Tailwind's `prose` modifiers (`prose-invert prose-headings:...`) — this is what `@tailwindcss/typography` is for. If not installed, add it as a dev dep.
- Removing the "← All posts" link. Posts must be navigable back to the index.
