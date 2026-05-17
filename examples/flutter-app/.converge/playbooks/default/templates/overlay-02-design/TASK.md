---
title: "Design: {{title}}"
description: "Generate constrained HTML design for {{title}} overlay using Flutter HTML Glossary"
skill: stitch-generate
tags:
  - design
  - html
  - overlay-{{overlayId}}
vars:
  overlayId:
  title:
  overlayType:
  specPath:
  metaPath:
  designPath:
inputs:
  - "{{specPath}}"
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
outputs:
  - "{{metaPath}}"
  - "{{designPath}}"
checks:
  - id: design-exists
    cmd: "test -f {{designPath}}"
    description: "design.html exists for {{overlayId}}"
  - id: meta-exists
    cmd: "test -f {{metaPath}}"
    description: "META.md exists for {{overlayId}}"
  - id: uses-glossary
    cmd: "grep -qE 'class=\"(column|row|card|bottom-sheet|dialog)\"' {{designPath}}"
    description: "HTML uses Flutter HTML Glossary vocabulary"
---

# Design: {{title}}

Generate the HTML design mockup for the **{{title}}** overlay using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Inputs
- `{{specPath}}` — Overlay specification
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/system/META.md` — Reference examples metadata

## Overlay Type: {{overlayType}}

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

1. **Read spec** — Load `{{specPath}}` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` for constrained vocabulary
3. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md`
4. **Read matched reference** — Study the matching example's patterns
5. **Generate META.md** — Write `{{metaPath}}` with example selection and scoring table
6. **Generate design.html** — Write `{{designPath}}` following `stitch-generate` skill using ONLY glossary elements

## Glossary Quick Reference

- Layout: `.column`, `.row`, `.stack`, `.wrap`, `.expanded`, `.padding`, `.sized-box`
- Text: `.title-large`, `.body-medium`, `.label-small` (Material 3 TextTheme classes)
- Components: `.card`, `.chip`, `.list-tile`, `.divider`, `.badge`, `.avatar`
- Buttons: `.elevated-btn`, `.filled-btn`, `.text-btn`, `.icon-btn`
- Icons: `<svg class="icon" data-name="{material_icon}" data-size="24">`
- Colors: `data-color="primary"`, `data-bg="surface"` (ColorScheme roles)
- Spacing: `data-spacing="md"`, `data-p="lg"` (token names)

## Output

- `{{metaPath}}` — Example selection and scoring
- `{{designPath}}` — Self-contained HTML mockup using glossary vocabulary
