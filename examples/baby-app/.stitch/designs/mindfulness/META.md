# META — Mindfulness Screen Design

## Example Selection

**Best match:** `single-screen.html`

### Scoring Table

| Dimension | Weight | Score | Rationale |
|-----------|--------|-------|-----------|
| App Type | High | High | Same app (Bloom pregnancy tracker) |
| Platform | High | High | Same phone target (375px base width) |
| Interaction Density | Medium | Medium | Category chips filtering + card taps + mood CTA — slightly more interactive than home |
| Visual Personality | Medium | High | Same Pastel Elevation aesthetic, same color palette |
| Component Overlap | Medium | High | Cards, bottom nav, hero card, grid layout all present in single-screen.html |
| Screen Pattern Match | High | High | Single screen with scrollable content — matches single-screen.html pattern |

**Decision:** Strong match. Use `single-screen.html` Scaffold structure — same bottom nav, same card styling, same CSS variable system. Replace home-specific sections (greeting, mode pill, stat grid) with mindfulness sections (category chips, featured exercise, exercise grid, mood banner).

## Structural Adaptations

- **AppBar:** Pinned title "Mindfulness" replacing greeting header
- **Category chips:** Horizontal scroll row replacing mode selector pill
- **Featured exercise card:** Hero-style card reusing `.hero-card` pattern with exercise data
- **Exercise grid:** 2-column grid reusing `.stat-grid` pattern but adapted for exercise cards
- **Mood banner:** Full-width card with row layout (icon + text + CTA button)
- **Bottom nav:** Wellness tab active instead of Home tab
