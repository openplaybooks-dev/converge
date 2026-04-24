---
id: 001-01-spec
title: "Spec: Home"
description: Generate Home screen specification
tags:
  - spec
  - screen-home
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
  - .stitch/references/ANALYSIS.md
  - .stitch/references/babyguard_home_phase_2_safe_updated/code.html
outputs:
  - .stitch/designs/home/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for home
    cmd: test -f .stitch/designs/home/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/home/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 001
  screenId: home
  title: Home
  widgetName: Home
  snakeName: home
  route: /
  screenPath: lib/screens/home/home_screen.dart
  widgetsJsonPath: .stitch/designs/home/widgets.jsonl
  localWidgetsDir: lib/screens/home/widgets
  screenTaskId: 001-home
  specPath: .stitch/designs/home/SPEC.md
  metaPath: .stitch/designs/home/META.md
  designPath: .stitch/designs/home/design.html
  prevScreenLastId: 
  htmlReference: .stitch/references/babyguard_home_phase_2_safe_updated/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/code.html\"\n"
---

# Spec: Home

Generate the screen specification for **Home** (`/`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions (includes `htmlReference` for this screen: `.stitch/references/babyguard_home_phase_2_safe_updated/code.html`)
- `.stitch/references/ANALYSIS.md` — Synthesized analysis of design references (if available)
- **Linked HTML reference** — Repo-relative path from `screens.json` → `htmlReference` for this screen (see below). When this path is **non-empty** and the file exists, it is mandatory input.

## Reference HTML (`htmlReference`)

Value from `.stitch/screens.json` for this screen: **`.stitch/references/babyguard_home_phase_2_safe_updated/code.html`**

- If **non-empty** and the file exists at that path: open and read that HTML. It is the **authoritative** Stitch/reference UI for this screen. The spec MUST describe the same screen as that file: **identical** section order, hierarchy, visible labels/copy (allow language normalization only if UX mandates another locale), controls, states implied by the markup, and layout intent. Map Tailwind or raw HTML structure into clear Flutter-oriented section descriptions. If `ANALYSIS.md` or `UX.md` disagrees with this file, **prefer the linked HTML** for layout and content fidelity.
- If **empty** or the file is missing: do **not** treat a single HTML file as authoritative; use `ANALYSIS.md` Screen Inventory and `UX.md` as before to infer the closest reference screens.

## Task

1. If there is **no** usable linked HTML (empty `htmlReference` or missing file) and `.stitch/references/ANALYSIS.md` exists, consult the Screen Inventory and Component Inventory to find reference screens that match this screen's purpose. Note matching references for use in the spec.

Read inputs and produce `.stitch/designs/home/SPEC.md` containing:

1. **Screen Title** — Home
2. **Purpose** — What this screen does and why
3. **Route** — `/`
4. **Widget Name** — `HomeScreen`
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

- `.stitch/designs/home/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
- When `htmlReference` is non-empty and the file exists, the spec explicitly states that the linked HTML was the fidelity source and the described UI matches it
