---
id: 003-01-spec
title: "Spec: Weight & Nutrition"
description: "Generate Weight & Nutrition screen specification"
tags:
  - spec
  - screen-weight-nutrition
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/designs/weight-nutrition/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for weight-nutrition
    cmd: test -f .stitch/designs/weight-nutrition/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/weight-nutrition/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 003
  screenId: weight-nutrition
  title: "Weight & Nutrition"
  widgetName: WeightNutrition
  snakeName: weight_nutrition
  route: /weight
  screenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  widgetsJsonPath: .stitch/designs/weight-nutrition/widgets.jsonl
  localWidgetsDir: lib/screens/weight_nutrition/widgets
  screenTaskId: 003-weight-nutrition
  specPath: .stitch/designs/weight-nutrition/SPEC.md
  metaPath: .stitch/designs/weight-nutrition/META.md
  designPath: .stitch/designs/weight-nutrition/design.html
  prevScreenLastId: 002-06-lift
---

# Spec: Weight & Nutrition

Generate the screen specification for **Weight & Nutrition** (`/weight`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `.stitch/designs/weight-nutrition/SPEC.md` containing:

1. **Screen Title** — Weight & Nutrition
2. **Purpose** — What this screen does and why
3. **Route** — `/weight`
4. **Widget Name** — `WeightNutritionScreen`
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

- `.stitch/designs/weight-nutrition/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
