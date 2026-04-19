---
id: 001-02-design
title: "Design: Mode Selection"
description: Generate constrained HTML design for Mode Selection overlay using Flutter HTML Glossary
dependencies:
  - 001-01-spec
tags:
  - design
  - html
  - overlay-mode-selector
inputs:
  - .stitch/designs/mode-selector/SPEC.md
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
outputs:
  - .stitch/designs/mode-selector/META.md
  - .stitch/designs/mode-selector/design.html
checks:
  - id: design-exists
    description: design.html exists for mode-selector
    cmd: test -f .stitch/designs/mode-selector/design.html
  - id: meta-exists
    description: META.md exists for mode-selector
    cmd: test -f .stitch/designs/mode-selector/META.md
  - id: uses-glossary
    description: HTML uses Flutter HTML Glossary vocabulary
    cmd: "grep -qE 'class=\"(column|row|card|bottom-sheet|dialog)\"' .stitch/designs/mode-selector/design.html"
vars:
  skill: stitch-generate
  prefix: 001
  overlayId: mode-selector
  title: Mode Selection
  widgetName: ModeSelector
  snakeName: mode_selector
  overlayTaskId: 001-mode-selector
  parentScreenId: home
  parentScreenPath: lib/screens/home/home_screen.dart
  overlayType: bottom-sheet
  specPath: .stitch/designs/mode-selector/SPEC.md
  metaPath: .stitch/designs/mode-selector/META.md
  designPath: .stitch/designs/mode-selector/design.html
  widgetPath: lib/widgets/overlays/mode_selector/mode_selector.dart
---

# Design: Mode Selection

Generate the HTML design mockup for the **Mode Selection** overlay using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Inputs
- `.stitch/designs/mode-selector/SPEC.md` — Overlay specification
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

1. **Read spec** — Load `.stitch/designs/mode-selector/SPEC.md` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` for constrained vocabulary
3. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md`
4. **Read matched reference** — Study the matching example's patterns
5. **Generate META.md** — Write `.stitch/designs/mode-selector/META.md` with example selection and scoring table
6. **Generate design.html** — Write `.stitch/designs/mode-selector/design.html` following `stitch-generate` skill using ONLY glossary elements

## Glossary Quick Reference

- Layout: `.column`, `.row`, `.stack`, `.wrap`, `.expanded`, `.padding`, `.sized-box`
- Text: `.title-large`, `.body-medium`, `.label-small` (Material 3 TextTheme classes)
- Components: `.card`, `.chip`, `.list-tile`, `.divider`, `.badge`, `.avatar`
- Buttons: `.elevated-btn`, `.filled-btn`, `.text-btn`, `.icon-btn`
- Icons: `<svg class="icon" data-name="{material_icon}" data-size="24">`
- Colors: `data-color="primary"`, `data-bg="surface"` (ColorScheme roles)
- Spacing: `data-spacing="md"`, `data-p="lg"` (token names)

## Output

- `.stitch/designs/mode-selector/META.md` — Example selection and scoring
- `.stitch/designs/mode-selector/design.html` — Self-contained HTML mockup using glossary vocabulary
