---
id: 07-integrate-blog
title: Phase 07 — Integrate /blog (content collection, listing, posts, RSS, OG, seed posts)
blocking: true
dependencies: [05-build-layout]
inputs:
  - apps/landing/.content/seo.json
  - README.md
  - docs/concepts
outputs:
  - apps/landing/src/content.config.ts
  - apps/landing/src/pages/blog/index.astro
  - apps/landing/src/pages/blog/[slug].astro
  - apps/landing/src/pages/rss.xml.ts
  - apps/landing/src/content/blog
---

The blog is a content collection. Posts are MDX files; routes are
generated dynamically from the collection. RSS feed + per-post OG images
make the blog shareable.

Six leaf tasks (sequential):

1. **001-collection-schema** — extend `src/content.config.ts` (created in phase 06) with a `blog` collection. Schema: title, description, date, author, tags, draft, pinned.
2. **002-listing-page** — `/blog` shows all posts ordered by date desc, with pinned posts at top.
3. **003-post-template** — `/blog/[slug]` dynamic route renders an MDX post with title, date, author, content, "back to blog" link.
4. **004-rss-feed** — `/rss.xml` generated via `@astrojs/rss`, lists all non-draft posts.
5. **005-og-images** — per-post Open Graph image generated at build time (or static placeholder for v1).
6. **006-seed-posts** — write 2 launch posts as MDX, sourced from README + concepts pages.
