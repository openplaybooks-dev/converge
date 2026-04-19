# META — Cycle Entry Design

## Example Selection

**Target Screen:** Cycle Entry — bottom-sheet overlay with drag handle, title ("Log Cycle"), start date selector, optional end date selector, irregular cycle toggle, optional notes field, and full-width coral "Save" pill button. No bottom navigation (overlay sits above it).

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static cards | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Mode selector pill, stat cards | Input fields, toggle, form elements | Cards, illustration |
| Screen Pattern Match | High | Has mode pill trigger — overlay context | Multi-state with toggles and inputs | No match |

### Decision

**Selected:** `single-screen.html` — **Moderate Match**

The cycle entry is a bottom-sheet overlay with form inputs (date selectors, toggle, notes), not a full screen. No example directly models a data-entry overlay. The single-screen reference is selected because it establishes the Bloom card/surface styling and bottom sheet chrome that this overlay must match. The toggle switch follows the Design System spec section on Toggle Switch. Input field patterns follow the Inputs & Forms section. Date selectors reuse the calendar row pattern from existing weight-entry and health-log-entry overlays.

**Patterns extracted:**
- Phone frame and Tailwind config with Bloom design tokens
- Card styling: `bg-surface rounded-t-[28px]` for bottom sheet
- Staggered fade-up entry animations with 80ms delays
- `data-flutter="bottom-sheet"` attribute for overlay identity
- Typography: Subheading for title, Caption for labels, Body for button
- Input fields: Soft Ivory background, Ghost Divide border
- Toggle switch: 52px wide, 30px tall, Chip Mist inactive, Lilac Pulse active
- Coral pill button: `bg-coral text-surface rounded-full` full-width
- Drag handle: 40px x 4px centered, Chip Mist color
