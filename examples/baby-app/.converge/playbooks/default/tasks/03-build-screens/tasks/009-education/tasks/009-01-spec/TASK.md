---
id: 009-01-spec
title: "Spec: Education"
description: Generate Education screen specification
tags:
  - spec
  - screen-education
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/designs/education/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for education
    cmd: test -f .stitch/designs/education/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/education/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 009
  screenId: education
  title: Education
  widgetName: Education
  snakeName: education
  route: /education
  screenPath: lib/screens/education/education_screen.dart
  widgetsJsonPath: .stitch/designs/education/widgets.jsonl
  localWidgetsDir: lib/screens/education/widgets
  screenTaskId: 009-education
  specPath: .stitch/designs/education/SPEC.md
  metaPath: .stitch/designs/education/META.md
  designPath: .stitch/designs/education/design.html
  prevScreenLastId: 008-06-lift
---

# Spec: Education

Generate the screen specification for **Education** (`/education`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `.stitch/designs/education/SPEC.md` containing:

1. **Screen Title** — Education
2. **Purpose** — What this screen does and why
3. **Route** — `/education`
4. **Widget Name** — `EducationScreen`
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

- `.stitch/designs/education/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
