---
id: 001-01-spec
title: "Spec: Alert Screen"
description: Generate Alert Screen overlay specification
tags:
  - spec
  - overlay-alert
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
  - 
outputs:
  - .stitch/designs/alert/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for alert
    cmd: test -f .stitch/designs/alert/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >30 lines"
    cmd: test $(wc -l < .stitch/designs/alert/SPEC.md) -gt 30
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 001
  overlayId: alert
  title: Alert Screen
  widgetName: Alert
  snakeName: alert
  overlayTaskId: 001-alert
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/alert/SPEC.md
  metaPath: .stitch/designs/alert/META.md
  designPath: .stitch/designs/alert/design.html
  widgetPath: lib/widgets/overlays/alert/alert.dart
---

# Spec: Alert Screen

Generate the overlay specification for **Alert Screen** (`alert`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen and overlay definitions
- `` — Parent screen (check for existing trigger placeholders)

## Context

This is an **overlay** (bottom-sheet), not a full screen. It is triggered from the **** screen. Overlays are presented using `showModalBottomSheet()`, `showDialog()`, or persistent bar patterns — never via GoRouter navigation.

**IMPORTANT:** Read the parent screen file (``) — the `03-build-screens` pipeline typically generates screens with placeholder triggers (e.g., `Placeholder()` builder, `SnackBar` stub, `debugPrint` stub) where overlays should be wired. Document the existing trigger location and placeholder pattern in the spec so the `05-mount` step knows exactly what to replace.

## Task

Read inputs and produce `.stitch/designs/alert/SPEC.md` containing:

1. **Overlay Title** — Alert Screen
2. **Overlay Type** — bottom-sheet (bottom-sheet | dialog | persistent-bar)
3. **Parent Screen** — 
4. **Trigger** — What user action opens this overlay (e.g., tap button, long press)
5. **Purpose** — What this overlay does and why it exists
6. **Widget Name** — `Alert`
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

- `.stitch/designs/alert/SPEC.md` exists and has >30 lines
- All required sections present
- Overlay type and parent screen clearly identified
- Trigger and dismiss behavior documented
- Design tokens reference DESIGN.md values
