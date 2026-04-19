# META — Health Log Design

## Example Selection

**Target Screen:** Health Log — tabbed list screen with three categories (Doctor Visits, Symptoms, Reminders), FAB for adding entries, and swipe-to-delete on list items.

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Cards, bottom nav, stat grid | Cards, list items, FAB, bottom nav | Cards, illustration, bottom nav |
| Screen Pattern Match | High | Single screen — no tabs | Multi-state — has stateful content sections | Celebration — no match |

### Decision

**Selected:** `multi-state-screen.html` — **Strong Match**

The Health Log screen is a multi-state screen with three tabs (Doctor Visits, Symptoms, Reminders), each containing a scrollable list with different card layouts. The multi-state reference provides the right Scaffold structure with FAB, list card patterns, and bottom navigation. The tab bar is adapted from the glossary's `data-flutter="tab-bar"` pattern.

**Patterns extracted:**
- Scaffold structure with bottom navigation (5 tabs, Health active)
- Card styling: `bg-surface rounded-3xl shadow-standard p-5`
- List item cards with date, title, and metadata layout
- FAB positioning: absolute bottom-right with coral fill
- Staggered fade-up entry animations with 80ms delays
- Tailwind config with Bloom design tokens
- `data-flutter` attributes for scaffold, tab-bar, tab-view, bottom-nav, nav-destination, safe-area, fab
