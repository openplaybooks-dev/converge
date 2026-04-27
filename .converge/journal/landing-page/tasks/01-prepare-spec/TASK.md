---
id: 01-prepare-spec
title: Phase 01 — Prepare spec (sitemap, sections, brand, SEO)
blocking: true
inputs:
  - banner.svg
  - README.md
  - docs
  - docs/_ia.json
outputs:
  - apps/landing/src/.content/sitemap.json
  - apps/landing/src/.content/sections.json
  - apps/landing/src/.content/brand.json
  - apps/landing/src/.content/seo.json
---

Synthesize the four spec files that drive every later phase. No code is
written here — only structured JSON describing what the site should be.
Later phases consume these files; the playbook never re-derives this
information.

Four leaf tasks:

1. **001-sitemap** — `apps/landing/.content/sitemap.json` enumerating every
   route the site will serve (`/`, `/docs/...`, `/blog`, `/blog/[slug]`,
   `/404`). Source: `docs/_ia.json` (canonical IA, owned by the docs
   playbook) + the canonical home / blog routes.

2. **002-sections-inventory** — `apps/landing/.content/sections.json`
   listing the 8 sections of the home page in render order. Each entry has
   `id`, `title`, `componentName`, `intent`. The `04-build-sections` WBS
   reads this file and spawns one parent + 5 step children per entry.

3. **003-brand-spec** — `apps/landing/.content/brand.json` extracting the
   visual identity from `banner.svg` (palette, typography, motif keywords)
   and the voice from `README.md` ("Why Converge?" bullets show the tone).

4. **004-seo-spec** — `apps/landing/.content/seo.json` with site-wide SEO
   defaults (title pattern, description, Open Graph image path,
   canonical domain) + per-route overrides for `/`, `/docs`, `/blog`.

These files are the contract for everything downstream. Don't write code
that "knows" sections without reading from sections.json; don't hardcode
brand colors that aren't in brand.json. Phase 10 audits the rendered site
against these files.
