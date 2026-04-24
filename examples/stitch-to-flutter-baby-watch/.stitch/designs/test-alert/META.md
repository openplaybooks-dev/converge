# META.md — Test Alert Countdown Sheet

## Linked HTML Fidelity

Design generated from UX.md §3.1 Home screen long-press interaction. No external HTML reference — built from spec.

## Screen Pattern

**Celebration** — Bottom sheet with countdown timer for test alert.

## Glossary Compliance

- Bottom sheet: card with rounded top corners
- Drag handle: 32×4px centered pill
- Title: "Thử cảnh báo"
- Large countdown number with "Giây" label
- Warning text
- Cancel button: "Hủy"

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Countdown number uses large display text (3.5rem, bold) — `TextStyle` with display size
- Timer ticks: `Timer.periodic` with 1 second interval in Flutter

## Score

Spec-compliant: test alert countdown with large number display, warning text, cancel action.