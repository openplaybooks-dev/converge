# META.md — Timeout Picker Sheet

## Linked HTML Fidelity

Design generated from UX.md §3.8 Settings timeout picker and BabyGuard design system. No external HTML reference — built from spec.

## Screen Pattern

**Celebration** — Bottom sheet with segmented timeout options.

## Glossary Compliance

- Bottom sheet: card with rounded top corners
- Drag handle: 32×4px centered pill
- Title: "Chọn thời gian chờ"
- Options: pill buttons (2/5/10 min) with selected state (earthy mint fill)
- Confirm button: "Xác nhận"

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Bottom sheet with segmented control — `showModalBottomSheet` + `SegmentedButton` in Flutter

## Score

Spec-compliant: timeout picker with 3 preset options + custom input, confirm button.