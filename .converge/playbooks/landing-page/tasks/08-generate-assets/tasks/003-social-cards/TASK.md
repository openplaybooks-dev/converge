---
id: 003-social-cards
title: Per-route OG variants (/og/home.png, /og/docs.png, /og/blog.png)
dependencies: [002-og-default]
inputs:
  - apps/landing/public/og/default.png
outputs:
  - apps/landing/public/og/home.png
  - apps/landing/public/og/docs.png
  - apps/landing/public/og/blog.png
checks:
  - id: home-og-exists
    cmd: "test -f apps/landing/public/og/home.png"
    description: og/home.png exists
  - id: docs-og-exists
    cmd: "test -f apps/landing/public/og/docs.png"
    description: og/docs.png exists
  - id: blog-og-exists
    cmd: "test -f apps/landing/public/og/blog.png"
    description: og/blog.png exists
---

# Per-route OG variants

For v1, identical-but-different-named files are acceptable — the
seo.json references `/og/home.png`, `/og/docs.png`, `/og/blog.png`, so
they need to exist as files. A future iteration can produce true
variants (different headlines per route).

## Process

```bash
cp apps/landing/public/og/default.png apps/landing/public/og/home.png
cp apps/landing/public/og/default.png apps/landing/public/og/docs.png
cp apps/landing/public/og/default.png apps/landing/public/og/blog.png
```

## Banned

- Generating different images that are visually inconsistent. If you do produce variants, they should share the same composition + brand palette — only the headline text varies.
