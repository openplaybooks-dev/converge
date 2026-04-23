# META.md — History Screen

## Linked HTML Fidelity

**Linked reference:** `.stitch/references/history/code.html`

Design.html mirrors the reference HTML structure, section order, and content within Flutter HTML Glossary vocabulary.

## Screen Pattern

**Multi-State Screen** — Event list with date headers, filter bar, and event detail bottom sheet.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + filter icon
- ListView with date section headers
- Bottom sheet: `data-flutter="bottom-sheet"` for event detail and filter

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Date headers use uppercase label styling — `TextStyle` with `letterSpacing: 1.2`
- Event cards use `ListTile` or custom `Card` with row layout

## Score

Spec-compliant: date-grouped list, event cards with type icons + timestamps, filter icon triggers bottom sheet.