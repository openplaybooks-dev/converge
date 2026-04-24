# META.md — Test Alert Countdown

## Linked HTML Fidelity

Design generated from UX.md §3.1 Home screen long-press interaction. No external HTML reference — built from spec.

## Screen Pattern

**Celebration** — Bottom sheet with animated countdown timer.

## Glossary Compliance

- Bottom sheet: card with rounded top corners (3rem radius)
- Drag handle: 32×4px centered pill
- Countdown: large display number (5rem) with peach tint background, animated tick
- Cancel button: full-width text button

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Countdown animation uses CSS `@keyframes` + JS interval for browser preview — in Flutter, use `Timer.periodic` with `setState`

## Score

Spec-compliant: test alert countdown with large number, animated tick, warning text, cancel action.