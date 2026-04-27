# Task: 04-build-sections/004-01-spec

# Spec: Six differentiators

Write `apps/landing/.content/sections/feature-grid/SPEC.md` — the spec document the next 4 steps consume.

## What goes in SPEC.md

1. **Section ID + Title**: `feature-grid` / `Six differentiators`
2. **Intent**: 3×2 grid of differentiator cards sourced from README.md 'Why Converge?' bullets. Each card: lucide icon + headline + ≤180-char body.
3. **Component name**: `FeatureGrid` (lives at `apps/landing/src/components/sections/FeatureGrid.astro`)
4. **Content sources** — the actual files the agent will read for copy:
   - For hero / cta-banner / feature-grid: `README.md` (Why Converge bullets), `apps/landing/.content/brand.json` (tagline)
   - For comparison: `docs/concepts/deterministic-checks.md`, `docs/concepts/dynamic-work-breakdown.md`
   - For faq: trade-offs sections of all 4 `docs/concepts/*.md` pages
   - For quickstart: `README.md`'s `## Quick Start` block
   - For social-proof: live GitHub API + npm registry (or static placeholder for now)
   - For problem-solution: `docs/concepts/dynamic-work-breakdown.md` (pre-declared-graph problem section)
5. **Required props** — what the `<FeatureGrid>` component will accept (most sections have no props; FAQ has `items`, FeatureGrid has `features`, etc.)
6. **Layout / states** — single state (hero, cta) vs. interactive (FAQ disclosure, comparison tabs)
7. **Acceptance criteria** — what makes this section "done":
   - Renders without console errors
   - Mobile responsive (320px+)
   - All copy traces to a real source file (no marketing-speak)
   - Uses brand tokens (no hardcoded hex)
   - For interactive sections: keyboard accessible
8. **Banned** — anti-patterns specific to this section (e.g. for hero: "no two CTAs of equal visual weight")

## Process

1. Read `apps/landing/.content/sections.json` — find the entry for `feature-grid` and verify the intent matches what's in this template.
2. Read the brand spec to know the palette + voice rules.
3. Read the source content files listed above.
4. Write `apps/landing/.content/sections/feature-grid/SPEC.md` covering the 8 sections above. Aim for 40–80 lines — comprehensive but not exhaustive.

## Banned

- Inventing content sources. Only the files listed above are valid sources.
- Acceptance criteria that aren't testable. "Looks good" is not a criterion; "renders <h1> with the canonical tagline" is.