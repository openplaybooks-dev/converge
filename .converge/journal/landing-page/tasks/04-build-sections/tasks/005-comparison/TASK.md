---
id: 005-comparison
title: "Section: Converge vs. step-driven"
dependencies:
  - 004-05-verify
tags:
  - section
  - section-comparison
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
outputs:
  - apps/landing/src/components/sections/InteractiveComparison.astro
vars:
  sectionId: comparison
  sectionTitle: Converge vs. step-driven
  componentName: InteractiveComparison
---

Parent task for the "Converge vs. step-driven" section.

Pipeline: spec → design → build → integrate → verify.

Intent: Tabbed code panel — same workflow goal in LangGraph vs. Converge. Below: condensed feature matrix derived from docs/concepts/deterministic-checks.md and dynamic-work-breakdown.md.
Component: `apps/landing/src/components/sections/InteractiveComparison.astro`.

