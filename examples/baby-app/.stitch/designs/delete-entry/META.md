# META — Delete Entry Confirmation Design

## Example Selection

**Target Screen:** Delete Entry Confirmation — a centered dialog overlay with title, body text, and a two-button action row (Cancel + destructive Delete). Brief, binary confirmation flow triggered by swipe-to-delete on health log entries. No navigation, no scrolling content.

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static cards | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Cards, buttons, surface styling | Toggles, buttons | Cards, illustration |
| Screen Pattern Match | High | No dialog pattern | No dialog pattern | No dialog pattern |

### Decision

**Selected:** `single-screen.html` — **Moderate Match**

No example directly models a dialog overlay. The single-screen reference is selected because it establishes the full Bloom design token vocabulary (colors, typography, shadows, spacing) and the Tailwind config pattern that all overlays reuse. The dialog chrome (backdrop, centered card, rounded corners, action row) follows the Design System spec sections on Dialogs and Buttons. The existing `due-date-picker/design.html` dialog serves as a direct structural sibling for the dialog container, backdrop, and action-row patterns.

**Patterns extracted:**
- Phone frame and Tailwind config with Bloom design tokens
- Dialog container: `bg-surface rounded-[24px] shadow-prominent` centered with backdrop
- Backdrop: `rgba(42, 42, 58, 0.24)` with fade-in animation
- Dialog entry: `scale(0.95) → scale(1)` with spring easing, 250ms
- `data-flutter="dialog"` attribute for overlay identity
- Typography scale: subheading (1.125rem/600) for title, body (1rem/400) for description
- Action row: right-aligned flex row with Cancel (ghost) + primary action (filled pill)
- Destructive button: Fault Red (#E85C5C) fill, Cloud White text per design system
- Cancel button: Chip Mist background, Ink Charcoal text per spec
