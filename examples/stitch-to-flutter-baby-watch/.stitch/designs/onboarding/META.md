# META.md — Onboarding Screen

## Linked HTML Fidelity

**Linked reference:** `.stitch/references/babyguard_onboarding_phase_2/code.html`

Design.html mirrors the reference HTML structure, section order, and content within Flutter HTML Glossary vocabulary.

## Screen Pattern

**Single Screen** — First-time setup with permission cards and page indicator footer.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + skip + title
- Permission cards: `Card` with row layout (icon + text)
- Footer: fixed position with page indicators + CTA button

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- PageView structure not directly represented in single HTML — PageView handled in Flutter code
- Footer uses `fixed bottom-0` — `Positioned` + `SafeArea` in Flutter

## Score

Spec-compliant: top bar with back/skip, superhero illustration, headline + copy, 4 permission cards, privacy note, page indicators + "Bắt đầu" CTA.