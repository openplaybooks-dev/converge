# META — Mode Selection Design

## Example Selection

**Target Screen:** Mode Selection — bottom-sheet overlay with drag handle, title, and three tappable mode option rows (Pregnancy, Wellness, Postpartum). Each row has a leading icon, label, description, and selected-state indicator. No bottom navigation (overlay sits above it).

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static cards | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Mode selector pill present, cards | Toggles, list rows | Cards, illustration |
| Screen Pattern Match | High | Has mode pill trigger — closest context | Multi-state with toggles | No match |

### Decision

**Selected:** `single-screen.html` — **Moderate Match**

The mode selector is a bottom-sheet overlay, not a full screen — no example directly models an overlay in isolation. The single-screen reference is selected because it contains the mode selector pill trigger and establishes the Bloom card/surface styling that the bottom sheet must match. Bottom sheet chrome (drag handle, backdrop, rounded top corners) follows the Design System spec section on Bottom Sheets. List-tile row patterns are adapted from the settings screen reference.

**Patterns extracted:**
- Phone frame and Tailwind config with Bloom design tokens
- Card styling: `bg-surface rounded-t-[28px]` for bottom sheet
- Staggered fade-up entry animations with 80ms delays
- `data-flutter="bottom-sheet"` attribute for overlay identity
- Typography scale: subheading for title, body for mode names, caption for descriptions
- Icon styling: inline SVG at 24px with coral/lilac color tokens
- List-tile row layout: leading icon + expanded text column + trailing checkmark
