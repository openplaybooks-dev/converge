# META.md — Safe Zones Screen

## Linked HTML Fidelity

**Linked reference:** `.stitch/references/safe_zones/code.html`

Design.html mirrors the reference HTML structure, section order, and content within Flutter HTML Glossary vocabulary.

## Screen Pattern

**Single Screen** — Safe zone management with map card, active zone list, and FAB.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with title and profile avatar
- Bottom Nav: `data-flutter="bottom-nav"` with 4 tabs (Home selected)
- FAB: `data-flutter="fab"` for adding new zone
- Toggle switches use ghost border + bg color shift

## Token Source

All tokens from `.stitch/system/DESIGN.md` — color palette from §2, typography from §3, spacing from §5, motion from §6.

## Compromises

- Map circles use CSS `border` + `rounded-full` — Flutter equivalent is `BoxDecoration` with `ShapeDecoration`
- "LIVE" badge uses custom pill styling — `Chip` widget in Flutter

## Score

Spec-compliant: AppBar (no back, tab root), mini map with pulsing circles, active zone list with toggles, 2-column insights grid, FAB for add.