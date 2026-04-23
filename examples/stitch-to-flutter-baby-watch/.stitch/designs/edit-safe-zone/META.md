# META.md — Edit Safe Zone Screen

## Linked HTML Fidelity

Design generated from UX.md §3.5 Edit Safe Zone screen. No external HTML reference — built from spec.

## Screen Pattern

**Single Screen** — Form screen for editing an existing safe zone. Same structure as Add Safe Zone with additional delete action.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + "Chỉnh sửa" title + Save button
- Same form fields as Add Safe Zone
- Additional: delete button (destructive, ghost)

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Delete button uses terracotta/error color — `OutlinedButton` with error color

## Score

Spec-compliant: same as Add Safe Zone plus delete action with confirmation dialog.