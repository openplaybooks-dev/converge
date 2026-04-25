---
id: 004-02-design
title: "Design: Filter Date Range"
description: Generate constrained HTML design for Filter Date Range overlay using Flutter HTML Glossary
dependencies:
  - 004-01-spec
tags:
  - design
  - html
  - overlay-filter-date
inputs:
  - .stitch/designs/filter-date/SPEC.md
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
outputs:
  - .stitch/designs/filter-date/META.md
  - .stitch/designs/filter-date/design.html
checks:
  - id: design-exists
    description: design.html exists for filter-date
    cmd: test -f .stitch/designs/filter-date/design.html
  - id: meta-exists
    description: META.md exists for filter-date
    cmd: test -f .stitch/designs/filter-date/META.md
  - id: uses-glossary
    description: HTML uses Flutter HTML Glossary vocabulary
    cmd: "grep -qE 'class=\"(column|row|card|bottom-sheet|dialog)\"' .stitch/designs/filter-date/design.html"
vars:
  skill: stitch-generate
  prefix: 004
  overlayId: filter-date
  title: Filter Date Range
  widgetName: FilterDate
  snakeName: filter_date
  overlayTaskId: 004-filter-date
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/filter-date/SPEC.md
  metaPath: .stitch/designs/filter-date/META.md
  designPath: .stitch/designs/filter-date/design.html
  widgetPath: lib/widgets/overlays/filter_date/filter_date.dart
---

# Design: Filter Date Range

Generate the HTML design mockup for the **Filter Date Range** overlay using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Inputs
- `.stitch/designs/filter-date/SPEC.md` — Overlay specification
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/system/META.md` — Reference examples metadata

## Overlay Type: bottom-sheet

Design the overlay container appropriate for its type:

### Bottom Sheet
- Root element: `<div class="bottom-sheet" data-bg="surface">`
- Include drag handle: `<div class="drag-handle">`
- Content area with scrollable body
- Optional action buttons at bottom
- Max height ~60% of viewport

### Dialog
- Root element: `<div class="dialog" data-bg="surface" data-radius="lg">`
- Title bar with close icon
- Content body
- Action row (cancel + confirm buttons)
- Fixed width ~320px

### Persistent Bar
- Root element: `<div class="persistent-bar" data-bg="surface-container">`
- Fixed height row layout
- Compact controls

## Steps

1. **Read spec** — Load `.stitch/designs/filter-date/SPEC.md` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` for constrained vocabulary
3. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md`
4. **Read matched reference** — Study the matching example's patterns
5. **Generate META.md** — Write `.stitch/designs/filter-date/META.md` with example selection and scoring table
6. **Generate design.html** — Write `.stitch/designs/filter-date/design.html` following `stitch-generate` skill using ONLY glossary elements

## Glossary Quick Reference

- Layout: `.column`, `.row`, `.stack`, `.wrap`, `.expanded`, `.padding`, `.sized-box`
- Text: `.title-large`, `.body-medium`, `.label-small` (Material 3 TextTheme classes)
- Components: `.card`, `.chip`, `.list-tile`, `.divider`, `.badge`, `.avatar`
- Buttons: `.elevated-btn`, `.filled-btn`, `.text-btn`, `.icon-btn`
- Icons: `<svg class="icon" data-name="{material_icon}" data-size="24">`
- Colors: `data-color="primary"`, `data-bg="surface"` (ColorScheme roles)
- Spacing: `data-spacing="md"`, `data-p="lg"` (token names)

## Output

- `.stitch/designs/filter-date/META.md` — Example selection and scoring
- `.stitch/designs/filter-date/design.html` — Self-contained HTML mockup using glossary vocabulary
