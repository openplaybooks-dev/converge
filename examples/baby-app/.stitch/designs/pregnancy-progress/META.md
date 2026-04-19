# META — Pregnancy Progress Design

## Example Selection

### Scoring Table

| Example | Pattern Match | Component Overlap | Layout Similarity | Total Score |
|---------|--------------|-------------------|-------------------|-------------|
| `celebration-screen.html` | 9/10 — Pregnancy progress milestone with hero, body changes, checklist | 9/10 — Hero header, info cards, checklist, bottom nav | 9/10 — Collapsing hero + vertical card stack + bottom nav | 27/30 |
| `single-screen.html` | 5/10 — Home dashboard, different purpose | 6/10 — Hero card, stat grid, bottom nav but no checklist/info cards | 5/10 — Centered hero + grid layout vs vertical scroll | 16/30 |
| `multi-state-screen.html` | 3/10 — Weight/nutrition tracking, different domain | 3/10 — Chart-focused, no hero illustration or checklist | 3/10 — Chart + detail panel vs card stack | 9/30 |

### Selected Example

**`celebration-screen.html`** — Best match. It is a pregnancy progress screen with the same hero header pattern (week number, trimester, baby illustration), progress countdown, body changes cards, baby development milestones, and self-care checklist. The layout structure (collapsing hero → scrollable card stack → bottom nav) maps directly to the target spec.

### Patterns to Reuse

- Hero header with gradient pregnancy background, back navigation, week display, and centered baby illustration
- Progress ring/countdown card with days remaining and due date
- Info card pattern with icon + heading + description rows separated by dividers
- Checklist card with checkbox states (checked/unchecked) and completion tracking
- Bottom navigation with active coral pill indicator
- CSS custom properties for design tokens (colors, typography, spacing, radius, shadows)
- Accessibility: ARIA labels on all sections, role attributes on interactive elements
