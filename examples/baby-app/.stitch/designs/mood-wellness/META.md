# META — Mood & Wellness Screen Design

## Example Selection

**Best match:** `single-screen.html`

### Scoring Table

| Dimension | Weight | Score | Rationale |
|-----------|--------|-------|-----------|
| App Type | High | High | Same app (Bloom pregnancy tracker) |
| Platform | High | High | Same phone target (375px base width) |
| Interaction Density | Medium | Medium | Mood logging interactions, chart taps, energy bar taps, recommendation row taps — moderate density |
| Visual Personality | Medium | High | Same Pastel Elevation aesthetic, same Bloom color palette and typography |
| Component Overlap | Medium | High | Cards, bottom nav, line chart, segmented bar, list items — maps well to single-screen patterns |
| Screen Pattern Match | High | High | Single scrollable screen with multiple card sections — matches single-screen.html pattern |

**Decision:** Strong match. Use `single-screen.html` Scaffold structure — same bottom nav, same card styling, same CSS variable system. Replace home sections with mood-specific sections (today's mood card, mood chart, energy tracker, recommendations, mood history list). Reuse mindfulness screen patterns for mood banner and card grid styling.

## Structural Adaptations

- **AppBar:** Collapsing title "Mood & Wellness" using SliverAppBar pattern
- **Today's mood card:** Full-width card with mood icon row and status text
- **Mood chart:** Full-width card with SVG line chart showing 14-day trend
- **Energy tracker:** Full-width card with 5-segment horizontal bar
- **Recommendations card:** Full-width card with vertical list of suggestion rows
- **Mood history list:** SliverList of individual mood entry cards
- **FAB:** Coral Bloom circular button bottom-right for mood logging
- **Bottom nav:** Wellness tab active
