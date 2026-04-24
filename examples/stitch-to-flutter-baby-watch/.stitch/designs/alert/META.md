# META.md — Alert Screen

## Linked HTML Fidelity

Design generated from UX.md §3.8 and BabyGuard design system tokens. No external HTML reference — built from spec.

## Screen Pattern

**Celebration** — Full-screen modal alert state with pulsing icon and countdown timer.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"` (no nav chrome)
- No AppBar, no BottomNav, no FAB
- Center-focused layout with `flex-col` + `items-center`

## Token Source

All tokens from `.stitch/system/DESIGN.md` — color palette, typography, spacing, motion.

## Compromises

- No external HTML reference to mirror — spec-driven generation
- Countdown animation simulated with CSS `@keyframes`

## Score

Design is spec-compliant: full-screen modal, pulsing alert icon (1000ms loop), countdown display, acknowledge button. No compromises needed.