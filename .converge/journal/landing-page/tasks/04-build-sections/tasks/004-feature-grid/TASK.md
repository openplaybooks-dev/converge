---
id: 004-feature-grid
title: "Section: Six differentiators"
dependencies:
  - 003-05-verify
tags:
  - section
  - section-feature-grid
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
outputs:
  - apps/landing/src/components/sections/FeatureGrid.astro
vars:
  sectionId: feature-grid
  sectionTitle: Six differentiators
  componentName: FeatureGrid
---

Parent task for the "Six differentiators" section.

Pipeline: spec → design → build → integrate → verify.

Intent: 3×2 grid of differentiator cards sourced from README.md 'Why Converge?' bullets. Each card: lucide icon + headline + ≤180-char body.
Component: `apps/landing/src/components/sections/FeatureGrid.astro`.

