# META — Cycle Tracking Design

## Example Selection

**Target Screen:** Cycle Tracking — calendar-based cycle visualization with summary stats and history list.

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Cards, bottom nav, stat grid | Cards, chart, detail panel, bottom nav | Cards, illustration, bottom nav |
| Screen Pattern Match | High | Single screen — close fit | Multi-state — calendar has month nav states | Celebration — no match |

### Decision

**Selected:** `single-screen.html` — **Strong Match**

The Cycle Tracking screen is primarily a single scrollable screen with a calendar card, summary card, and history list. While the calendar has month navigation states, the overall page structure (Scaffold + bottom nav + vertically stacked cards) aligns closely with the single-screen pattern. The home screen reference provides the right Scaffold chrome, card styling, and animation patterns.

**Patterns extracted:**
- Scaffold structure with bottom navigation (5 tabs, Health active)
- Card styling: `bg-surface rounded-3xl shadow-standard p-5`
- Staggered fade-up entry animations with 80ms delays
- FAB positioning pattern from glossary
- Tailwind config with Bloom design tokens
- `data-flutter` attributes for scaffold, bottom-nav, nav-destination, safe-area, fab
