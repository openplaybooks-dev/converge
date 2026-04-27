---
id: 007-faq
title: "Section: FAQ"
dependencies:
  - 006-05-verify
tags:
  - section
  - section-faq
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
outputs:
  - apps/landing/src/components/sections/Faq.astro
vars:
  sectionId: faq
  sectionTitle: FAQ
  componentName: Faq
---

Parent task for the "FAQ" section.

Pipeline: spec → design → build → integrate → verify.

Intent: 8 disclosure items derived from the trade-offs sections of docs/concepts/*.md (each trade-off is an honest objection + honest answer). Native <details>; deep-link anchors.
Component: `apps/landing/src/components/sections/Faq.astro`.

