---
title: "Design: {{title}}"
description: "Generate constrained HTML design for {{title}} using Flutter HTML Glossary"
skill: stitch-generate
tags:
  - design
  - html
  - screen-{{screenId}}
vars:
  screenId:
  title:
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
    description: "design.html exists for {{screenId}}"
  - id: meta-exists
    cmd: "test -f {{metaPath}}"
    description: "META.md exists for {{screenId}}"
  - id: uses-glossary
    cmd: "grep -q 'class=\"scaffold\"' {{designPath}}"
    description: "HTML uses Flutter HTML Glossary vocabulary"
  - id: has-data-attributes
    cmd: "grep -q 'data-color=' {{designPath}}"
    description: "HTML uses data-* attributes for Flutter conversion"
---

# Design: {{title}}

Generate the HTML design mockup for **{{title}}** using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Inputs
- `{{specPath}}` — Screen specification
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/system/META.md` — Reference examples metadata

## Steps

1. **Read spec** — Load `{{specPath}}` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` to understand the constrained vocabulary
3. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md`
4. **Read matched reference** — Study the matching example's patterns
5. **Generate META.md** — Write `{{metaPath}}` with example selection and scoring table
6. **Generate design.html** — Write `{{designPath}}` following `stitch-generate` skill using ONLY glossary elements

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

- `{{metaPath}}` — Example selection and scoring
- `{{designPath}}` — Self-contained HTML mockup at 375px using glossary vocabulary
