---
id: 008-cta-banner
title: "Section: Get started"
dependencies:
  - 007-05-verify
tags:
  - section
  - section-cta-banner
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
outputs:
  - apps/landing/src/components/sections/CtaBanner.astro
vars:
  sectionId: cta-banner
  sectionTitle: Get started
  componentName: CtaBanner
---

Parent task for the "Get started" section.

Pipeline: spec → design → build → integrate → verify.

Intent: Final conversion banner: tagline restated + two CTAs (Read the docs / Star on GitHub). Subtle indigo glow background mirroring banner.svg.
Component: `apps/landing/src/components/sections/CtaBanner.astro`.

