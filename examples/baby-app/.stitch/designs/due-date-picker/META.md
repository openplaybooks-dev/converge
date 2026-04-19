# META — Due Date Picker Design

## Example Selection

**Target Screen:** Due Date Picker — dialog overlay with title bar, month navigation, 7-column calendar grid, and confirm/cancel action row. Centered modal with backdrop, 360px max width, 24dp border-radius. No bottom navigation (overlay sits above it at z-index 70).

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static cards | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Cards, pills, buttons | Toggles, data grid, buttons | Cards, illustration |
| Screen Pattern Match | High | No dialog pattern | No dialog pattern | No dialog pattern |

### Decision

**Selected:** `single-screen.html` — **Moderate Match**

The due date picker is a dialog overlay, not a full screen — no example directly models a dialog in isolation. The single-screen reference is selected because it establishes the Bloom card/surface styling, button patterns (coral pill primary, ghost secondary), and Tailwind config with all design tokens. Dialog chrome (backdrop, centered card, border-radius, prominent shadow) follows the Design System spec section on z-index stack (Modal at z-70) and the Pastel Elevation prominent shadow tier.

**Patterns extracted:**
- Phone frame and Tailwind config with Bloom design tokens
- Card styling: `bg-surface rounded-[24px] shadow-prominent` for dialog container
- Button patterns: coral filled pill for Confirm, ghost pill for Cancel
- Typography scale: subheading (1.125rem/600) for title, data (0.875rem/500) for day numbers, micro (0.6875rem/700) for weekday headers
- Icon styling: inline SVG at 22px with lilac color for navigation arrows
- `data-flutter="dialog"` attribute for overlay identity
- Staggered fade-up entry animation with spring easing
