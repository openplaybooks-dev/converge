---
id: 08-generate-assets
title: Phase 08 — Generate static assets (favicon set, default OG, social cards)
blocking: true
dependencies: [03-design-system]
inputs:
  - apps/landing/.content/brand.json
  - apps/landing/src/icons/converge-mark.svg
outputs:
  - apps/landing/public/favicon.svg
  - apps/landing/public/apple-touch-icon.png
  - apps/landing/public/site.webmanifest
  - apps/landing/public/og/default.png
  - apps/landing/public/og/home.png
---

Static assets that don't change per page: favicons, default OG image,
Twitter/social card variants. These live in `apps/landing/public/` so
Astro emits them as-is to `dist/`.

Three leaf tasks:

1. **001-favicon-set** — `favicon.svg`, `apple-touch-icon.png`, `site.webmanifest` (PWA basics — even a static site benefits from a manifest for browser tab UI).
2. **002-og-default** — site-wide OG image at `public/og/default.png` (1200×630). Used as the fallback OG for any route that doesn't override.
3. **003-social-cards** — duplicate the OG default for `/og/home.png`, `/og/docs.png`, `/og/blog.png` (or generate variants if time permits — for v1, identical-but-different-named files are acceptable).
