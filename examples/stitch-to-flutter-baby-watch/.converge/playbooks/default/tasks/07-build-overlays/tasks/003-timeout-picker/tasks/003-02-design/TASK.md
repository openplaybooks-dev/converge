---
id: 003-02-design
title: "Design: Timeout Picker"
description: Generate constrained HTML design for Timeout Picker overlay using Flutter HTML Glossary
dependencies:
  - 003-01-spec
tags:
  - design
  - html
  - overlay-timeout-picker
inputs:
  - .stitch/designs/timeout-picker/SPEC.md
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
outputs:
  - .stitch/designs/timeout-picker/META.md
  - .stitch/designs/timeout-picker/design.html
checks:
  - id: design-exists
    description: design.html exists for timeout-picker
    cmd: test -f .stitch/designs/timeout-picker/design.html
  - id: meta-exists
    description: META.md exists for timeout-picker
    cmd: test -f .stitch/designs/timeout-picker/META.md
  - id: uses-glossary
    description: HTML uses Flutter HTML Glossary vocabulary
    cmd: "grep -qE 'class=\"(column|row|card|bottom-sheet|dialog)\"' .stitch/designs/timeout-picker/design.html"
vars:
  skill: stitch-generate
  prefix: 003
  overlayId: timeout-picker
  title: Timeout Picker
  widgetName: TimeoutPicker
  snakeName: timeout_picker
  overlayTaskId: 003-timeout-picker
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/timeout-picker/SPEC.md
  metaPath: .stitch/designs/timeout-picker/META.md
  designPath: .stitch/designs/timeout-picker/design.html
  widgetPath: lib/widgets/overlays/timeout_picker/timeout_picker.dart
---

# Design: Timeout Picker

Generate the HTML design mockup for the **Timeout Picker** overlay using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Inputs
- `.stitch/designs/timeout-picker/SPEC.md` — Overlay specification
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

1. **Read spec** — Load `.stitch/designs/timeout-picker/SPEC.md` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` for constrained vocabulary
3. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md`
4. **Read matched reference** — Study the matching example's patterns
5. **Generate META.md** — Write `.stitch/designs/timeout-picker/META.md` with example selection and scoring table
6. **Generate design.html** — Write `.stitch/designs/timeout-picker/design.html` following `stitch-generate` skill using ONLY glossary elements

## Glossary Quick Reference

- Layout: `.column`, `.row`, `.stack`, `.wrap`, `.expanded`, `.padding`, `.sized-box`
- Text: `.title-large`, `.body-medium`, `.label-small` (Material 3 TextTheme classes)
- Components: `.card`, `.chip`, `.list-tile`, `.divider`, `.badge`, `.avatar`
- Buttons: `.elevated-btn`, `.filled-btn`, `.text-btn`, `.icon-btn`
- Icons: `<svg class="icon" data-name="{material_icon}" data-size="24">`
- Colors: `data-color="primary"`, `data-bg="surface"` (ColorScheme roles)
- Spacing: `data-spacing="md"`, `data-p="lg"` (token names)

## Output

- `.stitch/designs/timeout-picker/META.md` — Example selection and scoring
- `.stitch/designs/timeout-picker/design.html` — Self-contained HTML mockup using glossary vocabulary
