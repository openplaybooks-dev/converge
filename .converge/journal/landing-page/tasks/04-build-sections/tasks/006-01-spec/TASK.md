---
id: 006-01-spec
title: "Spec: From zero to converged in 60s"
description: "Write SPEC.md for the From zero to converged in 60s section: intent, props, content sources, slots, acceptance criteria."
tags:
  - spec
  - section-quickstart
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - README.md
  - docs/concepts
  - docs/getting-started/why-converge.md
outputs:
  - apps/landing/.content/sections/quickstart/SPEC.md
checks:
  - id: spec-md-exists
    description: apps/landing/.content/sections/quickstart/SPEC.md exists
    cmd: test -f apps/landing/.content/sections/quickstart/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >=40 lines (substantive)"
    cmd: "test -f apps/landing/.content/sections/quickstart/SPEC.md && test $(wc -l < apps/landing/.content/sections/quickstart/SPEC.md) -ge 40"
  - id: spec-references-brand
    description: SPEC references brand spec or tokens
    cmd: "test -f apps/landing/.content/sections/quickstart/SPEC.md && grep -qE '(palette|tagline|brand|tokens)' apps/landing/.content/sections/quickstart/SPEC.md"
plan:
vars:
  prefix: 006
  sectionId: quickstart
  title: From zero to converged in 60s
  componentName: Quickstart
  componentPath: apps/landing/src/components/sections/Quickstart.astro
  contentDir: apps/landing/.content/sections/quickstart
  intent: "Three-step terminal walkthrough mirroring README.md's quickstart block. Each step is a copy-button code block."
  specPath: apps/landing/.content/sections/quickstart/SPEC.md
  designPath: apps/landing/.content/sections/quickstart/DESIGN.md
  passedPath: apps/landing/.content/sections/quickstart/PASSED
  sectionTaskId: 006-quickstart
  prevLastId: 005-05-verify
  kebabName: quickstart
---

# Spec: From zero to converged in 60s

Write `apps/landing/.content/sections/quickstart/SPEC.md` — the spec document the next 4 steps consume.

## What goes in SPEC.md

1. **Section ID + Title**: `quickstart` / `From zero to converged in 60s`
2. **Intent**: Three-step terminal walkthrough mirroring README.md's quickstart block. Each step is a copy-button code block.
3. **Component name**: `Quickstart` (lives at `apps/landing/src/components/sections/Quickstart.astro`)
4. **Content sources** — the actual files the agent will read for copy:
   - For hero / cta-banner / feature-grid: `README.md` (Why Converge bullets), `apps/landing/.content/brand.json` (tagline)
   - For comparison: `docs/concepts/deterministic-checks.md`, `docs/concepts/dynamic-work-breakdown.md`
   - For faq: trade-offs sections of all 4 `docs/concepts/*.md` pages
   - For quickstart: `README.md`'s `## Quick Start` block
   - For social-proof: live GitHub API + npm registry (or static placeholder for now)
   - For problem-solution: `docs/concepts/dynamic-work-breakdown.md` (pre-declared-graph problem section)
5. **Required props** — what the `<Quickstart>` component will accept (most sections have no props; FAQ has `items`, FeatureGrid has `features`, etc.)
6. **Layout / states** — single state (hero, cta) vs. interactive (FAQ disclosure, comparison tabs)
7. **Acceptance criteria** — what makes this section "done":
   - Renders without console errors
   - Mobile responsive (320px+)
   - All copy traces to a real source file (no marketing-speak)
   - Uses brand tokens (no hardcoded hex)
   - For interactive sections: keyboard accessible
8. **Banned** — anti-patterns specific to this section (e.g. for hero: "no two CTAs of equal visual weight")

## Process

1. Read `apps/landing/.content/sections.json` — find the entry for `quickstart` and verify the intent matches what's in this template.
2. Read the brand spec to know the palette + voice rules.
3. Read the source content files listed above.
4. Write `apps/landing/.content/sections/quickstart/SPEC.md` covering the 8 sections above. Aim for 40–80 lines — comprehensive but not exhaustive.

## Banned

- Inventing content sources. Only the files listed above are valid sources.
- Acceptance criteria that aren't testable. "Looks good" is not a criterion; "renders <h1> with the canonical tagline" is.
