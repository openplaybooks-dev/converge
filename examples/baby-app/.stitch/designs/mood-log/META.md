# META — Mood Log Design

## Example Selection

**Target Screen:** Mood Log — bottom-sheet overlay with drag handle, title ("Log Your Mood"), a row of 5 tappable mood option circles with labels, an energy level slider (1–5), an optional notes text field, and a full-width coral "Save Entry" pill button. No bottom navigation (overlay sits above it).

### Scoring Against Available Examples

| Dimension | Weight | `single-screen.html` | `multi-state-screen.html` | `celebration-screen.html` |
|---|---|---|---|---|
| App Type | High | Health/Wellness — same | Health/Wellness — same | Health/Wellness — same |
| Platform | High | Phone 375px — match | Phone 375px — match | Phone 375px — match |
| Interaction Density | Medium | Low — mostly static cards | Medium — chart + toggle states | Low — milestone display |
| Visual Personality | Medium | Pastel Elevation, rounded cards | Same design system | Same design system |
| Component Overlap | Medium | Mode selector pill, stat cards | Slider, toggle, form elements | Cards, illustration |
| Screen Pattern Match | High | Has bottom sheet trigger context | Multi-state with slider-like inputs | No match |

### Decision

**Selected:** `single-screen.html` — **Moderate Match**

The mood log is a bottom-sheet overlay with interactive selection and form inputs, not a full screen. No example directly models a multi-input data-entry overlay. The single-screen reference is selected because it establishes the Bloom card/surface styling and bottom sheet chrome that this overlay must match. The mood selector circles follow the chip/pill styling patterns. The energy slider follows the component patterns from the Design System spec. Input field patterns follow the Inputs & Forms section.

**Patterns extracted:**
- Phone frame and Tailwind config with Bloom design tokens
- Card styling: `bg-surface rounded-t-[28px]` for bottom sheet container
- Staggered fade-up entry animations with 80ms delays
- `data-flutter="bottom-sheet"` attribute for overlay identity
- Typography: Heading for title, Data for mood labels, Stat scale for energy value, Caption for input labels
- Mood circles: Chip Mist background (unselected), Coral Whisper with Coral border (selected)
- Input fields: Soft Ivory background, Ghost Divide border
- Coral pill button: `bg-coral text-surface rounded-full` full-width
- Drag handle: 40px x 4px centered, Chip Mist color
