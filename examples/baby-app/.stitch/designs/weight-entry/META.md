# META — Weight Entry Design

## Example Selection

**Target Screen:** Weight Entry — bottom-sheet overlay with drag handle, title ("Log Weight"), weight numeric input with unit toggle (kg/lbs), date selector row, optional notes field, and full-width coral "Save" pill button. No bottom navigation (overlay sits above it).

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

The weight entry is a bottom-sheet overlay with form inputs, not a full screen. No example directly models a data-entry overlay. The single-screen reference is selected because it establishes the Bloom card/surface styling and bottom sheet chrome that this overlay must match. Input field patterns follow the Design System spec section on Inputs & Forms. The numeric weight display follows the Stat typography scale from the type system.

**Patterns extracted:**
- Phone frame and Tailwind config with Bloom design tokens
- Card styling: `bg-surface rounded-t-[28px]` for bottom sheet
- Staggered fade-up entry animations with 80ms delays
- `data-flutter="bottom-sheet"` attribute for overlay identity
- Typography: Subheading for title, Stat scale for weight value, Caption for labels, Body for button
- Input fields: Soft Ivory background, Ghost Divide border, Lilac Pulse focus border
- Coral pill button: `bg-coral text-surface rounded-full` full-width
- Drag handle: 40px × 4px centered, Chip Mist color
