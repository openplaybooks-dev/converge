---
id: 006-02-design
title: "Design: Exercise Detail"
description: Generate constrained HTML design for Exercise Detail using Flutter HTML Glossary
dependencies:
  - 006-01-spec
tags:
  - design
  - html
  - screen-exercise-detail
inputs:
  - .stitch/designs/exercise-detail/SPEC.md
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
outputs:
  - .stitch/designs/exercise-detail/META.md
  - .stitch/designs/exercise-detail/design.html
checks:
  - id: design-exists
    description: design.html exists for exercise-detail
    cmd: test -f .stitch/designs/exercise-detail/design.html
  - id: meta-exists
    description: META.md exists for exercise-detail
    cmd: test -f .stitch/designs/exercise-detail/META.md
  - id: uses-glossary
    description: HTML uses Flutter HTML Glossary vocabulary
    cmd: "grep -q 'class=\"scaffold\"' .stitch/designs/exercise-detail/design.html"
  - id: has-data-attributes
    description: "HTML uses data-* attributes for Flutter conversion"
    cmd: "grep -q 'data-color=' .stitch/designs/exercise-detail/design.html"
vars:
  skill: stitch-generate
  prefix: 006
  screenId: exercise-detail
  title: Exercise Detail
  widgetName: ExerciseDetail
  snakeName: exercise_detail
  route: "/mindfulness/exercise/:id"
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  widgetsJsonPath: .stitch/designs/exercise-detail/widgets.jsonl
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenTaskId: 006-exercise-detail
  specPath: .stitch/designs/exercise-detail/SPEC.md
  metaPath: .stitch/designs/exercise-detail/META.md
  designPath: .stitch/designs/exercise-detail/design.html
  prevScreenLastId: 005-06-lift
---

# Design: Exercise Detail

Generate the HTML design mockup for **Exercise Detail** using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Inputs
- `.stitch/designs/exercise-detail/SPEC.md` — Screen specification
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/system/META.md` — Reference examples metadata

## Steps

1. **Read spec** — Load `.stitch/designs/exercise-detail/SPEC.md` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` to understand the constrained vocabulary
3. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md`
4. **Read matched reference** — Study the matching example's patterns
5. **Generate META.md** — Write `.stitch/designs/exercise-detail/META.md` with example selection and scoring table
6. **Generate design.html** — Write `.stitch/designs/exercise-detail/design.html` following `stitch-generate` skill using ONLY glossary elements

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

- `.stitch/designs/exercise-detail/META.md` — Example selection and scoring
- `.stitch/designs/exercise-detail/design.html` — Self-contained HTML mockup at 375px using glossary vocabulary
