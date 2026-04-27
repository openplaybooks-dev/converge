---
id: 09-polish
title: Phase 09 — Polish (hero animation, scroll reveals, image opt, font CLS)
blocking: true
dependencies: [04-build-sections, 06-integrate-docs, 07-integrate-blog, 08-generate-assets]
outputs:
  - apps/landing/src/components/animations/ConvergenceJourney.astro
  - apps/landing/src/components/ui/Image.astro
---

The polish that takes the page from "works" to "production-ready". Each
of these specifically targets a metric phase 10 will verify:

- Hero animation: visual differentiation (the "unique hallmark" the user asked for)
- Scroll reveals: perceived performance + delight (without impacting CLS)
- Image optimization: Lighthouse perf 95+
- Font CLS: Lighthouse perf 95+ (font swaps without layout shift)

Four leaf tasks (parallel-safe — no order dependencies between them):

1. **001-hero-animation** — `ConvergenceJourney.astro` — animated SVG showing 3-5 scattered dots converging to a target. Reduced-motion safe (respects `prefers-reduced-motion`).
2. **002-scroll-reveals** — IntersectionObserver-driven section reveals. Reduced-motion safe.
3. **003-image-opt** — `Image.astro` wrapper around Astro's `<Image>` enforcing AVIF/WebP, lazy loading, explicit dimensions.
4. **004-font-cls** — font-display strategy + size-adjust to eliminate cumulative layout shift from the Inter font load.

If any of these makes Lighthouse drop below 95, that's a real regression — the polish is the test.
