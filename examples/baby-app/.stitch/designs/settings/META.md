# META — Settings Design

## Example Selection

**Target Screen:** Settings — push route with scrollable list of card sections (Profile, Pregnancy, Notifications, Display, Data, About), containing toggle switches, setting rows with chevrons, and a destructive action with confirmation dialog. No bottom navigation, no FAB.

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Cards, greeting header, avatar | Cards, toggles, list items | Cards, illustration |
| Screen Pattern Match | High | Single screen — closest to settings list | Multi-state — has toggles but tab-focused | Celebration — no match |

### Decision

**Selected:** `single-screen.html` — **Moderate Match**

The Settings screen is a single-state scrollable list of card sections, making the single-screen reference the closest structural match. However, settings is a push route (no bottom nav) with an app bar back button, toggle switches, and list-tile rows — patterns not present in the home screen example. Toggle and list-tile patterns are adapted from the glossary and design system spec.

**Patterns extracted:**
- Phone frame and Tailwind config with Bloom design tokens
- Card styling: `bg-surface rounded-3xl shadow-standard p-5`
- Avatar component: circle with coral-tint background and initials fallback
- Staggered fade-up entry animations with 80ms delays
- `data-flutter` attributes for scaffold, app-bar, safe-area
- Typography scale: display, heading, subheading, body, data, caption, micro
