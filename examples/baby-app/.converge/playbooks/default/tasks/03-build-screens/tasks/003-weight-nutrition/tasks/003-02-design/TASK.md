---
id: 003-02-design
title: "Design: Weight & Nutrition"
description: "Generate constrained HTML design for Weight & Nutrition using Flutter HTML Glossary"
dependencies:
  - 003-01-spec
tags:
  - design
  - html
  - screen-weight-nutrition
inputs:
  - .stitch/designs/weight-nutrition/SPEC.md
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
outputs:
  - .stitch/designs/weight-nutrition/META.md
  - .stitch/designs/weight-nutrition/design.html
checks:
  - id: design-exists
    description: design.html exists for weight-nutrition
    cmd: test -f .stitch/designs/weight-nutrition/design.html
  - id: meta-exists
    description: META.md exists for weight-nutrition
    cmd: test -f .stitch/designs/weight-nutrition/META.md
  - id: uses-glossary
    description: HTML uses Flutter HTML Glossary vocabulary
    cmd: "grep -q 'class=\"scaffold\"' .stitch/designs/weight-nutrition/design.html"
  - id: has-data-attributes
    description: "HTML uses data-* attributes for Flutter conversion"
    cmd: "grep -q 'data-color=' .stitch/designs/weight-nutrition/design.html"
vars:
  skill: stitch-generate
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

# Design: Weight & Nutrition

Generate the HTML design mockup for **Weight & Nutrition** using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Inputs
- `.stitch/designs/weight-nutrition/SPEC.md` — Screen specification
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/system/META.md` — Reference examples metadata

## Steps

1. **Read spec** — Load `.stitch/designs/weight-nutrition/SPEC.md` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` to understand the constrained vocabulary
3. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md`
4. **Read matched reference** — Study the matching example's patterns
5. **Generate META.md** — Write `.stitch/designs/weight-nutrition/META.md` with example selection and scoring table
6. **Generate design.html** — Write `.stitch/designs/weight-nutrition/design.html` following `stitch-generate` skill using ONLY glossary elements

## Glossary Quick Reference

- Layout: `.column`, `.row`, `.stack`, `.wrap`, `.expanded`, `.padding`, `.sized-box`
- Scaffold: `.scaffold`, `.app-bar`, `.body`, `.bottom-nav`, `.fab`
- Text: `.title-large`, `.body-medium`, `.label-small` (Material 3 TextTheme classes)
- Components: `.card`, `.chip`, `.list-tile`, `.divider`, `.badge`, `.avatar`
- Buttons: `.elevated-btn`, `.filled-btn`, `.text-btn`, `.icon-btn`
- Images: `.network-image`, `.placeholder-image`
- Icons: `<svg class="icon" data-name="{material_icon}" data-size="24">`
- Colors: `data-color="primary"`, `data-bg="surface"` (ColorScheme roles)
- Spacing: `data-spacing="md"`, `data-p="lg"` (token names)
- Animation: `data-animate="fade-in"`, `data-animate-delay="100"`
- Navigation: `.ink-well` with `data-route="/path"`

## Output

- `.stitch/designs/weight-nutrition/META.md` — Example selection and scoring
- `.stitch/designs/weight-nutrition/design.html` — Self-contained HTML mockup at 375px using glossary vocabulary
