# META.md — Co-Guardians List Screen

## Linked HTML Fidelity

**Linked reference:** `.stitch/references/ch_p_nh_n_l_i_m_i/code.html`

Design.html mirrors the reference HTML structure, section order, and content within Flutter HTML Glossary vocabulary.

## Screen Pattern

**Single Screen** — Guardian list with avatar/initials, status pills, and swipe-to-remove.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + Add button
- Guardian cards: `Card` with `Row` layout (avatar + name + status pill)
- Status pills use color-coded backgrounds (mint/honey/peach)
- Swipe-to-remove: `Dismissible` widget in Flutter

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Avatar circles use colored background + initials text — `CircleAvatar` in Flutter
- Swipe actions use `Dismissible` with red background

## Score

Spec-compliant: guardian cards with colored avatar, name, last seen time, status pill (Đang gần beacon / Xa / Ngoại tuyến), swipe-to-remove.