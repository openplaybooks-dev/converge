---
id: 003-problem-solution
title: "Section: Define how vs. define done"
dependencies:
  - 002-05-verify
tags:
  - section
  - section-problem-solution
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - apps/landing/src/styles/tokens.json
outputs:
  - apps/landing/src/components/sections/ProblemSolution.astro
vars:
  sectionId: problem-solution
  sectionTitle: Define how vs. define done
  componentName: ProblemSolution
---

Parent task for the "Define how vs. define done" section.

Pipeline: spec → design → build → integrate → verify.

Intent: Side-by-side: left shows imperative step-driven framework code; right shows declarative converge TASK.md. Visualizes the paradigm flip.
Component: `apps/landing/src/components/sections/ProblemSolution.astro`.

