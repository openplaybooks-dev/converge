---
id: 005-02-design
title: "Design: Safe Zones"
description: Generate constrained HTML design for Safe Zones using Flutter HTML Glossary
dependencies:
  - 005-01-spec
tags:
  - design
  - html
  - screen-safe-zones
inputs:
  - .stitch/designs/safe-zones/SPEC.md
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
  - .stitch/references/ANALYSIS.md
  - .stitch/references/safe_zones/code.html
outputs:
  - .stitch/designs/safe-zones/META.md
  - .stitch/designs/safe-zones/design.html
checks:
  - id: design-exists
    description: design.html exists for safe-zones
    cmd: test -f .stitch/designs/safe-zones/design.html
  - id: meta-exists
    description: META.md exists for safe-zones
    cmd: test -f .stitch/designs/safe-zones/META.md
  - id: uses-glossary
    description: HTML uses Flutter HTML Glossary vocabulary
    cmd: "grep -q 'class=\"scaffold\"' .stitch/designs/safe-zones/design.html"
  - id: has-data-attributes
    description: "HTML uses data-* attributes for Flutter conversion"
    cmd: "grep -q 'data-color=' .stitch/designs/safe-zones/design.html"
vars:
  skill: stitch-generate
  prefix: 005
  screenId: safe-zones
  title: Safe Zones
  widgetName: SafeZones
  snakeName: safe_zones
  route: /safe-zones
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  widgetsJsonPath: .stitch/designs/safe-zones/widgets.jsonl
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenTaskId: 005-safe-zones
  specPath: .stitch/designs/safe-zones/SPEC.md
  metaPath: .stitch/designs/safe-zones/META.md
  designPath: .stitch/designs/safe-zones/design.html
  prevScreenLastId: 004-06-lift
  htmlReference: .stitch/references/safe_zones/code.html
  htmlReferenceInput: "  - \".stitch/references/safe_zones/code.html\"\n"
---

# Design: Safe Zones

Generate the HTML design mockup for **Safe Zones** using the **Flutter HTML Glossary** constrained vocabulary.

## Critical Constraint

The HTML MUST use ONLY elements from the **Flutter HTML Glossary** (`stitch-flutter/references/flutter-html-glossary.md`). This ensures the `stitch-flutter` converter can produce pixel-perfect Flutter widgets mechanically.

## Linked reference HTML (`htmlReference`)

Path from `screens.json` for this screen: **`.stitch/references/safe_zones/code.html`**

- When **non-empty** and the file exists: that file is the **fidelity target**. `.stitch/designs/safe-zones/design.html` MUST reproduce the same structure, section order, hierarchy, spacing rhythm, and visible text/icons as that reference **as closely as the Flutter HTML Glossary allows**. Do not invent alternate layouts. Where the glossary has no one-to-one element, pick the closest glossary mapping and note the compromise in `.stitch/designs/safe-zones/META.md`.
- When **empty** or missing: infer structure from `.stitch/designs/safe-zones/SPEC.md`, `ANALYSIS.md`, and example selection per below.

## Inputs
- `.stitch/designs/safe-zones/SPEC.md` — Screen specification
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/system/META.md` — Reference examples metadata
- **Linked HTML** — `.stitch/references/safe_zones/code.html` when set (see above)

## Steps

1. **Read spec** — Load `.stitch/designs/safe-zones/SPEC.md` to understand layout, sections, data
2. **Read glossary** — Load `stitch-flutter/references/flutter-html-glossary.md` to understand the constrained vocabulary
3. **Linked HTML first** — If `.stitch/references/safe_zones/code.html` is non-empty and the file exists, read it completely. Treat it as the visual ground truth for `design.html` (subject to glossary-only elements). Skip browsing other `code.html` files for layout unless the linked file is unusable.
4. **Otherwise consult references** — If there is no linked HTML (or it is missing) and `.stitch/references/ANALYSIS.md` exists, use the Screen Inventory to find matching `code.html` paths as structural guides
5. **Select best example match** — Read `.stitch/system/META.md` and score against examples per `stitch-generate/references/selecting-examples.md` (especially when no linked HTML)
6. **Read matched reference** — Study the chosen example's patterns when step 3 did not supply a file
7. **Generate META.md** — Write `.stitch/designs/safe-zones/META.md` with example selection, scoring table, and (when used) explicit note that `design.html` was matched to `.stitch/references/safe_zones/code.html`
8. **Generate design.html** — Write `.stitch/designs/safe-zones/design.html` following `stitch-generate` skill using ONLY glossary elements; **pixel-fidelity to the linked reference HTML** when `htmlReference` is present and valid

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

- `.stitch/designs/safe-zones/META.md` — Example selection and scoring; document linked-HTML fidelity when applicable
- `.stitch/designs/safe-zones/design.html` — Self-contained HTML mockup at 375px using glossary vocabulary; when `htmlReference` is set and valid, structure and content mirror that file within glossary constraints
