---
id: 004-01-spec
title: "Spec: Pregnancy Progress"
description: Generate Pregnancy Progress screen specification
tags:
  - spec
  - screen-pregnancy-progress
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/designs/pregnancy-progress/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for pregnancy-progress
    cmd: test -f .stitch/designs/pregnancy-progress/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/pregnancy-progress/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 004
  screenId: pregnancy-progress
  title: Pregnancy Progress
  widgetName: PregnancyProgress
  snakeName: pregnancy_progress
  route: /progress
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  widgetsJsonPath: .stitch/designs/pregnancy-progress/widgets.jsonl
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenTaskId: 004-pregnancy-progress
  specPath: .stitch/designs/pregnancy-progress/SPEC.md
  metaPath: .stitch/designs/pregnancy-progress/META.md
  designPath: .stitch/designs/pregnancy-progress/design.html
  prevScreenLastId: 003-06-lift
---

# Spec: Pregnancy Progress

Generate the screen specification for **Pregnancy Progress** (`/progress`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `.stitch/designs/pregnancy-progress/SPEC.md` containing:

1. **Screen Title** — Pregnancy Progress
2. **Purpose** — What this screen does and why
3. **Route** — `/progress`
4. **Widget Name** — `PregnancyProgressScreen`
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

- `.stitch/designs/pregnancy-progress/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
