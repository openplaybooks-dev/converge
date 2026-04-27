---
id: 006-quickstart
title: "Section: From zero to converged in 60s"
dependencies:
  - 005-05-verify
tags:
  - section
  - section-quickstart
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
outputs:
  - apps/landing/src/components/sections/Quickstart.astro
vars:
  sectionId: quickstart
  sectionTitle: From zero to converged in 60s
  componentName: Quickstart
---

Parent task for the "From zero to converged in 60s" section.

Pipeline: spec → design → build → integrate → verify.

Intent: Three-step terminal walkthrough mirroring README.md's quickstart block. Each step is a copy-button code block.
Component: `apps/landing/src/components/sections/Quickstart.astro`.

