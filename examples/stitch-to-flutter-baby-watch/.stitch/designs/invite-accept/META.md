# META.md — Accept Invitation Screen

## Linked HTML Fidelity

**Linked reference:** `.stitch/references/co_guardians_list_phase_2/code.html`

Design.html mirrors the reference HTML structure, section order, and content within Flutter HTML Glossary vocabulary.

## Screen Pattern

**Single Screen** — Centered card with beacon info, inviter display, and accept/reject buttons.

## Glossary Compliance

- Scaffold: `data-flutter="scaffold"`
- AppBar: `data-flutter="app-bar"` with back + "Lời mời theo dõi" title
- Centered card: `Center` + `Card` with column layout
- Beacon avatar: circle with child_care icon on mint background
- Action buttons: primary (earthy mint fill) + ghost (text only)

## Token Source

All tokens from `.stitch/system/DESIGN.md`.

## Compromises

- Centered card layout — `Center` + `SizedBox` + `Card` in Flutter
- No bottom nav on this screen (modal-like push route)

## Score

Spec-compliant: centered card with beacon info (name, inviter, role), trust note, Accept/Reject buttons.