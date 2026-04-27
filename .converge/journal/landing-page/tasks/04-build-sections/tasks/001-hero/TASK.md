---
id: 001-hero
title: "Section: Hero"
tags:
  - section
  - section-hero
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
outputs:
  - apps/landing/src/components/sections/Hero.astro
vars:
  sectionId: hero
  sectionTitle: Hero
  componentName: Hero
---

Parent task for the "Hero" section.

Pipeline: spec → design → build → integrate → verify.

Intent: Tagline-first hero with the canonical 'Define done. Converge gets there.' line, an animated convergence motif, and two CTAs (Get started → /docs/getting-started, Star on GitHub).
Component: `apps/landing/src/components/sections/Hero.astro`.

