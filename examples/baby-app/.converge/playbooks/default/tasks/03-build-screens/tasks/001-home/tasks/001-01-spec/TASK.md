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
  route: /home
  screenPath: lib/screens/home/home_screen.dart
  widgetsJsonPath: .stitch/designs/home/widgets.jsonl
  localWidgetsDir: lib/screens/home/widgets
  screenTaskId: 001-home
  specPath: .stitch/designs/home/SPEC.md
  metaPath: .stitch/designs/home/META.md
  designPath: .stitch/designs/home/design.html
  prevScreenLastId: 
---

# Spec: Home

Generate the screen specification for **Home** (`/home`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `.stitch/designs/home/SPEC.md` containing:

1. **Screen Title** — Home
2. **Purpose** — What this screen does and why
3. **Route** — `/home`
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
