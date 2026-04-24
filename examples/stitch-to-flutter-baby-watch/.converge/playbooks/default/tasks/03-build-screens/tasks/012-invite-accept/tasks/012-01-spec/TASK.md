---
id: 012-01-spec
title: "Spec: Accept Invitation"
description: Generate Accept Invitation screen specification
tags:
  - spec
  - screen-invite-accept
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
  - .stitch/references/ANALYSIS.md
  - .stitch/references/co_guardians_list_phase_2/code.html
outputs:
  - .stitch/designs/invite-accept/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for invite-accept
    cmd: test -f .stitch/designs/invite-accept/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/invite-accept/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 012
  screenId: invite-accept
  title: Accept Invitation
  widgetName: InviteAccept
  snakeName: invite_accept
  route: "/invite/:code"
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  widgetsJsonPath: .stitch/designs/invite-accept/widgets.jsonl
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenTaskId: 012-invite-accept
  specPath: .stitch/designs/invite-accept/SPEC.md
  metaPath: .stitch/designs/invite-accept/META.md
  designPath: .stitch/designs/invite-accept/design.html
  prevScreenLastId: 011-06-lift
  htmlReference: .stitch/references/co_guardians_list_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/co_guardians_list_phase_2/code.html\"\n"
---

# Spec: Accept Invitation

Generate the screen specification for **Accept Invitation** (`/invite/:code`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions (includes `htmlReference` for this screen: `.stitch/references/co_guardians_list_phase_2/code.html`)
- `.stitch/references/ANALYSIS.md` — Synthesized analysis of design references (if available)
- **Linked HTML reference** — Repo-relative path from `screens.json` → `htmlReference` for this screen (see below). When this path is **non-empty** and the file exists, it is mandatory input.

## Reference HTML (`htmlReference`)

Value from `.stitch/screens.json` for this screen: **`.stitch/references/co_guardians_list_phase_2/code.html`**

- If **non-empty** and the file exists at that path: open and read that HTML. It is the **authoritative** Stitch/reference UI for this screen. The spec MUST describe the same screen as that file: **identical** section order, hierarchy, visible labels/copy (allow language normalization only if UX mandates another locale), controls, states implied by the markup, and layout intent. Map Tailwind or raw HTML structure into clear Flutter-oriented section descriptions. If `ANALYSIS.md` or `UX.md` disagrees with this file, **prefer the linked HTML** for layout and content fidelity.
- If **empty** or the file is missing: do **not** treat a single HTML file as authoritative; use `ANALYSIS.md` Screen Inventory and `UX.md` as before to infer the closest reference screens.

## Task

1. If there is **no** usable linked HTML (empty `htmlReference` or missing file) and `.stitch/references/ANALYSIS.md` exists, consult the Screen Inventory and Component Inventory to find reference screens that match this screen's purpose. Note matching references for use in the spec.

Read inputs and produce `.stitch/designs/invite-accept/SPEC.md` containing:

1. **Screen Title** — Accept Invitation
2. **Purpose** — What this screen does and why
3. **Route** — `/invite/:code`
4. **Widget Name** — `InviteAcceptScreen`
5. **Design Tokens** — Colors, typography, spacing from DESIGN.md
6. **Layout Rules** — Scaffold structure, app bar, body, bottom nav
7. **Sections** — Each visual section with:
   - Description of content
   - Widget type (ListView, GridView, Column, etc.)
   - Data requirements
   - Interactive elements
8. **Data** — Entities and fields displayed on this screen
9. **Motion** — Entry animations, transitions, hero animations
10. **Accessibility** — Semantics labels, focus order, contrast notes
11. **Anti-Patterns** — Things to avoid

## Success Criteria

- `.stitch/designs/invite-accept/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
- When `htmlReference` is non-empty and the file exists, the spec explicitly states that the linked HTML was the fidelity source and the described UI matches it
