---
id: 005-01-spec
title: "Spec: Converge vs. step-driven"
description: "Write SPEC.md for the Converge vs. step-driven section: intent, props, content sources, slots, acceptance criteria."
tags:
  - spec
  - section-comparison
inputs:
  - apps/landing/.content/sections.json
  - apps/landing/.content/brand.json
  - README.md
  - docs/concepts
  - docs/getting-started/why-converge.md
outputs:
  - apps/landing/.content/sections/comparison/SPEC.md
checks:
  - id: spec-md-exists
    description: apps/landing/.content/sections/comparison/SPEC.md exists
    cmd: test -f apps/landing/.content/sections/comparison/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >=40 lines (substantive)"
    cmd: "test -f apps/landing/.content/sections/comparison/SPEC.md && test $(wc -l < apps/landing/.content/sections/comparison/SPEC.md) -ge 40"
  - id: spec-references-brand
    description: SPEC references brand spec or tokens
    cmd: "test -f apps/landing/.content/sections/comparison/SPEC.md && grep -qE '(palette|tagline|brand|tokens)' apps/landing/.content/sections/comparison/SPEC.md"
plan:
vars:
  prefix: 005
  sectionId: comparison
  title: Converge vs. step-driven
  componentName: InteractiveComparison
  componentPath: apps/landing/src/components/sections/InteractiveComparison.astro
  contentDir: apps/landing/.content/sections/comparison
  intent: "Tabbed code panel — same workflow goal in LangGraph vs. Converge. Below: condensed feature matrix derived from docs/concepts/deterministic-checks.md and dynamic-work-breakdown.md."
  specPath: apps/landing/.content/sections/comparison/SPEC.md
  designPath: apps/landing/.content/sections/comparison/DESIGN.md
  passedPath: apps/landing/.content/sections/comparison/PASSED
  sectionTaskId: 005-comparison
  prevLastId: 004-05-verify
  kebabName: interactive-comparison
---

# Spec: Converge vs. step-driven

Write `apps/landing/.content/sections/comparison/SPEC.md` — the spec document the next 4 steps consume.

## What goes in SPEC.md

1. **Section ID + Title**: `comparison` / `Converge vs. step-driven`
2. **Intent**: Tabbed code panel — same workflow goal in LangGraph vs. Converge. Below: condensed feature matrix derived from docs/concepts/deterministic-checks.md and dynamic-work-breakdown.md.
3. **Component name**: `InteractiveComparison` (lives at `apps/landing/src/components/sections/InteractiveComparison.astro`)
4. **Content sources** — the actual files the agent will read for copy:
   - For hero / cta-banner / feature-grid: `README.md` (Why Converge bullets), `apps/landing/.content/brand.json` (tagline)
   - For comparison: `docs/concepts/deterministic-checks.md`, `docs/concepts/dynamic-work-breakdown.md`
   - For faq: trade-offs sections of all 4 `docs/concepts/*.md` pages
   - For quickstart: `README.md`'s `## Quick Start` block
   - For social-proof: live GitHub API + npm registry (or static placeholder for now)
   - For problem-solution: `docs/concepts/dynamic-work-breakdown.md` (pre-declared-graph problem section)
5. **Required props** — what the `<InteractiveComparison>` component will accept (most sections have no props; FAQ has `items`, FeatureGrid has `features`, etc.)
6. **Layout / states** — single state (hero, cta) vs. interactive (FAQ disclosure, comparison tabs)
7. **Acceptance criteria** — what makes this section "done":
   - Renders without console errors
   - Mobile responsive (320px+)
   - All copy traces to a real source file (no marketing-speak)
   - Uses brand tokens (no hardcoded hex)
   - For interactive sections: keyboard accessible
8. **Banned** — anti-patterns specific to this section (e.g. for hero: "no two CTAs of equal visual weight")

## Process

1. Read `apps/landing/.content/sections.json` — find the entry for `comparison` and verify the intent matches what's in this template.
2. Read the brand spec to know the palette + voice rules.
3. Read the source content files listed above.
4. Write `apps/landing/.content/sections/comparison/SPEC.md` covering the 8 sections above. Aim for 40–80 lines — comprehensive but not exhaustive.

## Banned

- Inventing content sources. Only the files listed above are valid sources.
- Acceptance criteria that aren't testable. "Looks good" is not a criterion; "renders <h1> with the canonical tagline" is.
