---
id: 05-build-layout
title: Phase 05 — Build the layout (MainLayout, Header, Footer, Head/SEO, error pages)
blocking: true
dependencies: [03-design-system]
inputs:
  - apps/landing/.content/brand.json
  - apps/landing/.content/seo.json
  - apps/landing/.content/sitemap.json
outputs:
  - apps/landing/src/layouts/MainLayout.astro
  - apps/landing/src/components/layout/Header.astro
  - apps/landing/src/components/layout/Footer.astro
  - apps/landing/src/components/layout/Head.astro
  - apps/landing/src/pages/404.astro
---

The layout owns everything around the page content — `<head>`, header
nav, footer, error fallbacks. v1's failure was the layout still
referenced `siteData.json` from the upstream theme so `<title>ScrewFast</title>`
rendered. v2's contract: the layout reads from `apps/landing/.content/{brand,seo,sitemap}.json`
and nothing else for branding info.

Five leaf tasks (sequential):

1. **001-main-layout** — `MainLayout.astro` reads brand + seo + slot for page content. Wraps Header + main + Footer. Imports `globals.css`.
2. **002-navigation** — `Header.astro` renders the converge mark + nav links (Home / Docs / Blog / GitHub) from sitemap.json.
3. **003-footer** — `Footer.astro` renders brand + links + copyright + GitHub link.
4. **004-head-seo** — `Head.astro` centralizes all `<meta>`, `<link>`, `<title>` from seo.json. Per-route overrides via props.
5. **005-error-pages** — `src/pages/404.astro` (and optionally `500.astro`) using MainLayout.

Phase 04 (sections) and phase 05 (layout) are parallel — both depend on phase 03 only. Phase 04's tasks reference `MainLayout` but use a placeholder import until phase 05 lands; the integrate step (`{{prefix}}-04-integrate`) is forgiving about which Layout is in scope, and phase 09 polish does the final swap if needed.
