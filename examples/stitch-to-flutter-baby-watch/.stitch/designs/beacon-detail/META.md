# META.md — Beacon Detail Screen

## Linked HTML Fidelity

**Linked reference:** `.stitch/references/chi_ti_t_beacon_phase_2/code.html`

Design.html mirrors the reference HTML structure, section order, and content within Flutter HTML Glossary vocabulary.

## Screen Pattern

**Single Screen** — Beacon detail with hero section, technical accordion, co-guardian list, and destructive action.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + "Beacon Detail" title + more_vert menu
- Hero section: 80×80dp rounded-xl avatar with child_care icon + beacon name (3.5rem) + subtitle
- Technical accordion: expansion tile with settings_ethernet icon
- Co-guardian list card: card with rounded-xl, shadow, internal padding
- Guardian rows: avatar circle (Mẹ/Bố/Bà Nội initials) + name + last seen + status pill
- FAB: `data-flutter="fab"` with person_add icon
- Destructive button: ghost with error color

## Token Source

All tokens from `.stitch/system/DESIGN.md` — mint tint, honey tint, earthy mint, terracotta alert per status states.

## Compromises

- Accordion uses `ExpansionTile` or `AnimatedContainer` — browser preview uses `group` hover + `expand_more` rotation
- Status pills: "Đang gần beacon" has pulsing dot (CSS animation) — `AnimatedOpacity` in Flutter

## Score

Spec-compliant: hero with beacon avatar + name, technical details accordion, 3 co-guardian rows with colored avatars and status pills (near/far/offline), FAB for invite, "Rời nhóm" destructive action.