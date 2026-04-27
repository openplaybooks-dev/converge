---
id: 10-verify
title: Phase 10 — Verify production-ready (build + Lighthouse 95 + brand audit + meta + links)
blocking: true
dependencies: [09-polish]
inputs:
  - apps/landing/dist
  - README.md
outputs:
  - apps/landing/.verify-passed
---

The gate. Phase 11 (ship) blocks on this phase. Every check must pass —
there is no "close enough" path to deployment.

Nine leaf tasks (sequential — each verifies a different aspect):

1. **001-build-clean** — `pnpm build` succeeds with zero warnings/errors
2. **002-dev-smoke** — dev server starts, `curl /` returns 200, body contains the canonical tagline
3. **003-no-upstream-brand** — zero references to ScrewFast/AstroWind/Foxi/AstroPaper/Astroship in src/ or dist/
4. **004-no-placeholders** — zero Lorem/TBD/FIXME/TODO strings in dist/
5. **005-lighthouse-perf** — Lighthouse Performance ≥ 95 on home
6. **006-lighthouse-a11y** — Lighthouse Accessibility ≥ 95 on home
7. **007-link-check** — lychee on dist, zero broken internal links
8. **008-meta-validation** — OG / Twitter / canonical / lang meta tags all present and non-empty
9. **009-tagline-drift** — tagline in dist/index.html matches README.md byte-for-byte

If ALL 9 pass, write `apps/landing/.verify-passed` (the marker phase 11 reads).
