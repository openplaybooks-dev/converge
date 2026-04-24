# META.md — Settings Screen

## Linked HTML Fidelity

**Linked reference:** `.stitch/references/settings/code.html`

Design.html mirrors the reference HTML structure, section order, and content within Flutter HTML Glossary vocabulary.

## Screen Pattern

**Single Screen** — Grouped settings sections with profile, alert config, beacon setup, and general preferences.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + overflow menu
- Bottom Nav: `data-flutter="bottom-nav"` (Settings tab active)
- Segmented control: 3-option pill group with `bg-[#efeee8]` container + white selected
- Toggle switches: rounded pill track with sliding knob

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Profile section uses large avatar with verified badge overlay — `Stack` with `Positioned`
- Sign out uses peach/error tint — `ElevatedButton` with `backgroundColor`

## Score

Spec-compliant: grouped card sections, segmented timeout picker, toggles, horizontal mute pills, sign out button.