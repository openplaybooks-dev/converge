# Spec: Converge vs. step-driven

## Section ID + Title
- **id**: `comparison`
- **title**: `Converge vs. step-driven`

## Intent
Tabbed code panel showing the same workflow goal expressed in LangGraph (imperative DAG) vs. Converge (declarative task definition). Below the panel: condensed feature matrix comparing the two approaches — derived from `docs/concepts/deterministic-checks.md` and `docs/concepts/dynamic-work-breakdown.md`.

## Component name
`InteractiveComparison` — lives at `apps/landing/src/components/sections/InteractiveComparison.astro`

## Content sources
- `docs/concepts/deterministic-checks.md` — trade-offs section for the Converge checks column
- `docs/concepts/dynamic-work-breakdown.md` — pre-declared-graph problem section for the LangGraph column
- `apps/landing/.content/brand.json` — palette + voice rules (tagline: `Define done. Converge gets there.`)

## Required props
None — this section is self-contained. Tab state is internal only.

## Layout / states
- **Default state**: LangGraph tab active, showing imperative node-edge code sample. Converge tab hidden.
- **Converge tab**: Shows the equivalent declarative TASK.md. Both tabs are visually distinct.
- **Feature matrix**: Static table below the tabs comparing LangGraph and Converge across ~6 dimensions. No interactive state beyond tab switching.
- **Mobile (320px+)**: Tabs collapse to a `<select>` dropdown. Matrix scrolls horizontally with `overflow-x: auto`.

## Acceptance criteria
- [ ] Renders without console errors
- [ ] Mobile responsive (320px+)
- [ ] Tab switching works via keyboard (arrow keys) and click
- [ ] All copy traces to a real source file (no marketing-speak)
- [ ] Uses brand palette tokens (no hardcoded hex values)
- [ ] Feature matrix rows are derived from the trade-offs sections of the two source docs

## Banned
- Hardcoded hex colors — must use palette tokens from `brand.json` (`#0F1117`, `#6366F1`, etc.)
- Marketing language ("revolutionary", "game-changing", "AI-native") — voice banned list from `brand.json`
- Equal visual weight on both tabs — Converge tab should be visually emphasized as the recommended path
- Comparing different workflow goals — both tabs must express the same underlying goal to make the comparison meaningful
- Using palette values not defined in brand.json — all colors must trace to a token
