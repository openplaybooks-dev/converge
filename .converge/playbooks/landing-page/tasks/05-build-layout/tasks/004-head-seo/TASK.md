---
id: 004-head-seo
title: Head.astro — centralizes <meta>, <link>, <title>, OG, Twitter, canonical
dependencies: [001-main-layout]
inputs:
  - apps/landing/.content/seo.json
  - apps/landing/.content/brand.json
outputs:
  - apps/landing/src/components/layout/Head.astro
checks:
  - id: head-exists
    cmd: "test -f apps/landing/src/components/layout/Head.astro"
    description: Head.astro exists
  - id: head-emits-title
    cmd: "test -f apps/landing/src/components/layout/Head.astro && grep -qE '<title>' apps/landing/src/components/layout/Head.astro"
    description: emits a <title> tag
  - id: head-emits-og
    cmd: "test -f apps/landing/src/components/layout/Head.astro && grep -qE 'og:title|og:description|og:image' apps/landing/src/components/layout/Head.astro"
    description: emits Open Graph meta tags
  - id: head-emits-twitter
    cmd: "test -f apps/landing/src/components/layout/Head.astro && grep -qE 'twitter:card' apps/landing/src/components/layout/Head.astro"
    description: emits Twitter card meta
  - id: head-emits-canonical
    cmd: "test -f apps/landing/src/components/layout/Head.astro && grep -qE 'rel=\"canonical\"' apps/landing/src/components/layout/Head.astro"
    description: emits canonical link
---

# Head

Centralizes the page `<head>`. MainLayout passes per-page props in;
Head emits the right tags.

## File

```astro
---
// apps/landing/src/components/layout/Head.astro
import seo from '@/.content/seo.json' with { type: 'json' };

interface Props {
  title: string;
  description: string;
  ogImage: string;
  canonical: string;
}

const { title, description, ogImage, canonical } = Astro.props;
const absoluteOg = ogImage.startsWith('http') ? ogImage : `${seo.site.canonical}${ogImage}`;
---

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content={Astro.generator} />
  <meta name="theme-color" content={seo.site.themeColor} />

  <title>{title}</title>
  <meta name="description" content={description} />

  <link rel="canonical" href={canonical} />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />

  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={absoluteOg} />
  <meta property="og:url" content={canonical} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Converge" />
  <meta property="og:locale" content={seo.site.locale} />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={absoluteOg} />
  <meta name="twitter:site" content={seo.site.twitterHandle} />

  <slot />
</head>
```

## Process

1. Write the file.
2. The `<slot />` at the end lets pages inject their own page-specific tags (e.g. `<link rel="alternate" type="application/rss+xml">` on the blog index).
3. Run `astro check`.

## Banned

- `keywords` meta. Search engines stopped using it in ~2009.
- Hardcoded URLs / titles. All values come through props or seo.json.
- Inline `<style>` or `<script>` here. Head is metadata only.
