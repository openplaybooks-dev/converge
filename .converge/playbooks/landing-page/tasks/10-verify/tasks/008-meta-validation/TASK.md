---
id: 008-meta-validation
title: OG / Twitter / canonical / lang meta tags all present and non-empty
dependencies: [001-build-clean]
checks:
  - id: meta-validation
    cmd: "node .converge/playbooks/landing-page/scripts/check-meta-validation.mjs"
    description: all required meta tags present in dist/index.html
  - id: sitemap-exists
    cmd: "test -d apps/landing/dist && (test -f apps/landing/dist/sitemap-index.xml || test -f apps/landing/dist/sitemap.xml)"
    description: sitemap.xml is emitted
  - id: robots-exists
    cmd: "test -f apps/landing/dist/robots.txt"
    description: robots.txt is emitted
  - id: og-default-shipped
    cmd: "test -d apps/landing/dist && (test -f apps/landing/dist/og.png || test -f apps/landing/dist/og/default.png)"
    description: default OG image is in dist
---

# Meta validation

Run the meta-validation script + verify the static SEO files exist.

```bash
node .converge/playbooks/landing-page/scripts/check-meta-validation.mjs
```

The script asserts:
- `<html lang="...">` (non-empty)
- `<title>` (non-empty, NOT "Astro" or any forked-theme name)
- `<meta name="description" content="...">` (non-empty)
- `<link rel="canonical" href="...">` (non-empty)
- `<meta property="og:title">`, `og:description`, `og:image` (all non-empty)
- `<meta name="twitter:card" content="...">` (any value)

Plus this task verifies:
- `dist/sitemap.xml` (or `sitemap-index.xml`) exists — emitted by `@astrojs/sitemap`
- `dist/robots.txt` exists — written by phase 11 or by Astro static
- `dist/og/default.png` (or `dist/og.png`) exists — from phase 08

If any of these is missing, fix the responsible upstream task and re-build.
