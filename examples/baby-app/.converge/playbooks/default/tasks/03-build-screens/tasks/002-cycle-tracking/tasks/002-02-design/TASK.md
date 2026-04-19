---
id: 002-02-design
title: "Design: Cycle Tracking"
description: Generate constrained HTML design for Cycle Tracking using Flutter HTML Glossary
dependencies:
  - 002-01-spec
tags:
  - design
  - html
  - screen-cycle-tracking
inputs:
  - .stitch/designs/cycle-tracking/SPEC.md
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
outputs:
  - .stitch/designs/cycle-tracking/META.md
  - .stitch/designs/cycle-tracking/design.html
checks:
  - id: design-exists
    description: design.html exists for cycle-tracking
    cmd: test -f .stitch/designs/cycle-tracking/design.html
  - id: meta-exists
    description: META.md exists for cycle-tracking
    cmd: test -f .stitch/designs/cycle-tracking/META.md
  - id: uses-glossary
    description: HTML uses Flutter HTML Glossary vocabulary
    cmd: "grep -q 'class=\"scaffold\"' .stitch/designs/cycle-tracking/design.html"
  - id: has-data-attributes
    description: "HTML uses data-* attributes for Flutter conversion"
    cmd: "grep -q 'data-color=' .stitch/designs/cycle-tracking/design.html"
vars:
  skill: stitch-generate
  prefix: 002
  screenId: cycle-tracking
  title: Cycle Tracking
  widgetName: CycleTracking
  snakeName: cycle_tracking
  route: /cycle
  screenPath: lib/screens/cycle_tracking/cycle_tracking_screen.dart
  widgetsJsonPath: .stitch/designs/cycle-tracking/widgets.jsonl
  localWidgetsDir: lib/screens/cycle_tracking/widgets
  screenTaskId: 002-cycle-tracking
  specPath: .stitch/designs/cycle-tracking/SPEC.md
  metaPath: .stitch/designs/cycle-tracking/META.md
  designPath: .stitch/designs/cycle-tracking/design.html
  prevScreenLastId: 001-06-lift
---

# Design: Cycle Tracking

Generate the HTML design mockup for **Cycle Tracking** using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Inputs
- `.stitch/designs/cycle-tracking/SPEC.md` — Screen specification
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/system/META.md` — Reference examples metadata

## Steps

1. **Read spec** — Load `.stitch/designs/cycle-tracking/SPEC.md` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` to understand the constrained vocabulary
3. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md`
4. **Read matched reference** — Study the matching example's patterns
5. **Generate META.md** — Write `.stitch/designs/cycle-tracking/META.md` with example selection and scoring table
6. **Generate design.html** — Write `.stitch/designs/cycle-tracking/design.html` following `stitch-generate` skill using ONLY glossary elements

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

- `.stitch/designs/cycle-tracking/META.md` — Example selection and scoring
- `.stitch/designs/cycle-tracking/design.html` — Self-contained HTML mockup at 375px using glossary vocabulary
