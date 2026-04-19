# META — Health Log Entry Design

## Example Selection

**Target Screen:** Health Log Entry — bottom-sheet overlay with drag handle, title ("New Entry"), three-chip type selector (Visit / Symptom / Reminder), conditional form fields per type (date selector, text inputs, severity chips), and full-width coral "Save" pill button. No bottom navigation (overlay sits above it).

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static cards | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Mode selector pill, stat cards, chip selectors | Input fields, toggle, form elements | Cards, illustration |
| Screen Pattern Match | High | Has mode pill trigger — overlay context | Multi-state with toggles and inputs | No match |

### Decision

**Selected:** `single-screen.html` — **Moderate Match**

The health log entry is a bottom-sheet overlay with a type selector and conditional form inputs, not a full screen. No example directly models a multi-state data-entry overlay. The single-screen reference is selected because it establishes the Bloom card/surface styling, chip selector patterns (mode selector pill), and bottom sheet chrome that this overlay must match. Input field patterns follow the Design System spec section on Inputs & Forms. Chip selector patterns follow the Mode / Category Chips section.

**Patterns extracted:**
- Phone frame and Tailwind config with Bloom design tokens
- Card styling: `bg-surface rounded-t-[28px]` for bottom sheet
- Staggered fade-up entry animations with 80ms delays
- `data-flutter="bottom-sheet"` attribute for overlay identity
- Typography: Subheading for title, Caption for labels, Body for input values and button
- Chip selectors: pill-shaped with coral-tint active state, chip-bg inactive state
- Input fields: Soft Ivory background, Ghost Divide border, 16px border-radius
- Coral pill button: `bg-coral text-surface rounded-full` full-width
- Drag handle: 40px x 4px centered, Chip Mist color
