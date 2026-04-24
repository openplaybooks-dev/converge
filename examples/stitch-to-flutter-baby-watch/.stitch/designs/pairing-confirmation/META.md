# META.md — Pairing Confirmation Sheet

## Linked HTML Fidelity

Design generated from UX.md §3.7 and BabyGuard design system. No external HTML reference — built from spec.

## Screen Pattern

**Celebration** — Bottom sheet modal for beacon pairing confirmation.

## Glossary Compliance

- Bottom sheet: rendered as full-screen card with rounded top corners (32px radius) for browser preview
- Drag handle: centered 32×4px pill, ghost border
- Beacon info: sensor icon in mint circle + name + UUID preview
- Actions: "Ghép nối" primary button + "Hủy" text button

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Browser preview uses card with rounded top corners — Flutter `showModalBottomSheet` with `ShapeDecoration`
- Slide up animation: easeOutCubic 250ms

## Score

Spec-compliant: bottom sheet with drag handle, beacon info card, pairing confirm + cancel actions.