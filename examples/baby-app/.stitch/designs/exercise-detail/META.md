# META — Exercise Detail Screen Design

## Example Selection

**Best match:** `single-screen.html`

### Scoring Table

| Dimension | Weight | Score | Rationale |
|-----------|--------|-------|-----------|
| App Type | High | High | Same app (Bloom pregnancy tracker) |
| Platform | High | High | Same phone target (375px base width) |
| Interaction Density | Medium | Low | Mostly read-only content with a single footer CTA — lower interaction density than home |
| Visual Personality | Medium | High | Same Pastel Elevation aesthetic, same color palette |
| Component Overlap | Medium | Medium | Hero card, numbered list, chip row, and footer button — partial overlap with single-screen.html patterns |
| Screen Pattern Match | High | Medium | Detail screen pushed from mindfulness grid — no bottom nav, back button in app bar. Closest structural match is single-screen.html adapted as a detail view |

**Decision:** Moderate match. Use `single-screen.html` Scaffold chrome (app bar, card styling, CSS variable system) but adapt for detail-screen structure: replace bottom nav with persistent footer button, add back button to app bar, use vertical scrolling column of section cards instead of grid layout.

## Structural Adaptations

- **AppBar:** Back arrow + exercise name replacing display title. Cloud White background, no collapsing
- **Hero illustration card:** Full-width card with centered SVG illustration, exercise name, and category tag
- **Instructions card:** Cloud White card with numbered step rows using lilac circle badges
- **Duration & difficulty chips:** Pill chips on canvas (no card wrapper) with icon + text
- **Benefits card:** Cloud White card with check-circle icon rows
- **Footer button:** Full-width coral pill "Start Exercise" button replacing bottom nav
- **Bottom nav:** Hidden — this is a pushed detail screen
