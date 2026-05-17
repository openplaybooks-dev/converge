---
title: "Spec: {{title}}"
description: "Generate {{title}} overlay specification"
plan: true
references:
  - flutter-building-layouts
tags:
  - spec
  - overlay-{{overlayId}}
vars:
  overlayId:
  title:
  overlayType:
  parentScreenId:
  parentScreenPath:
  widgetName:
  specPath:
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
  - "{{parentScreenPath}}"
outputs:
  - "{{specPath}}"
checks:
  - id: spec-exists
    cmd: "test -f {{specPath}}"
    description: "SPEC.md exists for {{overlayId}}"
  - id: spec-has-content
    cmd: "test $(wc -l < {{specPath}}) -gt 30"
    description: "SPEC.md has >30 lines"
---

# Spec: {{title}}

Generate the overlay specification for **{{title}}** (`{{overlayId}}`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen and overlay definitions
- `{{parentScreenPath}}` — Parent screen (check for existing trigger placeholders)

## Context

This is an **overlay** ({{overlayType}}), not a full screen. It is triggered from the **{{parentScreenId}}** screen. Overlays are presented using `showModalBottomSheet()`, `showDialog()`, or persistent bar patterns — never via GoRouter navigation.

**IMPORTANT:** Read the parent screen file (`{{parentScreenPath}}`) — the `03-build-screens` pipeline typically generates screens with placeholder triggers (e.g., `Placeholder()` builder, `SnackBar` stub, `debugPrint` stub) where overlays should be wired. Document the existing trigger location and placeholder pattern in the spec so the `05-mount` step knows exactly what to replace.

## Task

Read inputs and produce `{{specPath}}` containing:

1. **Overlay Title** — {{title}}
2. **Overlay Type** — {{overlayType}} (bottom-sheet | dialog | persistent-bar)
3. **Parent Screen** — {{parentScreenId}}
4. **Trigger** — What user action opens this overlay (e.g., tap button, long press)
5. **Purpose** — What this overlay does and why it exists
6. **Widget Name** — `{{widgetName}}`
7. **Design Tokens** — Colors, typography, spacing from DESIGN.md
8. **Layout** — Container structure:
   - For bottom-sheet: drag handle, content area, action buttons, max height
   - For dialog: title bar, content, action row, max width
   - For persistent-bar: height, background, content layout
9. **Sections** — Each visual section with:
   - Description of content
   - Widget type (ListView, Column, Wrap, etc.)
   - Interactive elements (buttons, toggles, inputs)
10. **Data** — Entities and fields displayed/edited
11. **Dismiss Behavior** — How the overlay closes (swipe down, tap outside, confirm button, cancel)
12. **Return Value** — What data (if any) the overlay passes back to the parent when dismissed
13. **Accessibility** — Semantics labels, focus trapping, screen reader announcements

## Success Criteria

- `{{specPath}}` exists and has >30 lines
- All required sections present
- Overlay type and parent screen clearly identified
- Trigger and dismiss behavior documented
- Design tokens reference DESIGN.md values
