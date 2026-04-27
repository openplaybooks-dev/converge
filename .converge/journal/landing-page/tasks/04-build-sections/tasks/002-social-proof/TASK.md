---
id: 002-social-proof
title: "Section: Trusted by builders"
dependencies:
  - 001-05-verify
tags:
  - section
  - section-social-proof
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
outputs:
  - apps/landing/src/components/sections/SocialProof.astro
vars:
  sectionId: social-proof
  sectionTitle: Trusted by builders
  componentName: SocialProof
---

Parent task for the "Trusted by builders" section.

Pipeline: spec → design → build → integrate → verify.

Intent: Lightweight credibility row: GitHub stars (live), npm downloads (live). Honest about being early — 'Used by' not 'Trusted by Fortune 500'.
Component: `apps/landing/src/components/sections/SocialProof.astro`.

