---
id: 004-01-spec
title: "Spec: Health Log Entry"
description: Generate Health Log Entry overlay specification
tags:
  - spec
  - overlay-health-log-entry
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
  - lib/screens/health_log/health_log_screen.dart
outputs:
  - .stitch/designs/health-log-entry/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for health-log-entry
    cmd: test -f .stitch/designs/health-log-entry/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >30 lines"
    cmd: test $(wc -l < .stitch/designs/health-log-entry/SPEC.md) -gt 30
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 004
  overlayId: health-log-entry
  title: Health Log Entry
  widgetName: HealthLogEntry
  snakeName: health_log_entry
  overlayTaskId: 004-health-log-entry
  parentScreenId: health-log
  parentScreenPath: lib/screens/health_log/health_log_screen.dart
  overlayType: bottom-sheet
  specPath: .stitch/designs/health-log-entry/SPEC.md
  metaPath: .stitch/designs/health-log-entry/META.md
  designPath: .stitch/designs/health-log-entry/design.html
  widgetPath: lib/widgets/overlays/health_log_entry/health_log_entry.dart
---

# Spec: Health Log Entry

Generate the overlay specification for **Health Log Entry** (`health-log-entry`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen and overlay definitions
- `lib/screens/health_log/health_log_screen.dart` — Parent screen (check for existing trigger placeholders)

## Context

This is an **overlay** (bottom-sheet), not a full screen. It is triggered from the **health-log** screen. Overlays are presented using `showModalBottomSheet()`, `showDialog()`, or persistent bar patterns — never via GoRouter navigation.

**IMPORTANT:** Read the parent screen file (`lib/screens/health_log/health_log_screen.dart`) — the `03-build-screens` pipeline typically generates screens with placeholder triggers (e.g., `Placeholder()` builder, `SnackBar` stub, `debugPrint` stub) where overlays should be wired. Document the existing trigger location and placeholder pattern in the spec so the `05-mount` step knows exactly what to replace.

## Task

Read inputs and produce `.stitch/designs/health-log-entry/SPEC.md` containing:

1. **Overlay Title** — Health Log Entry
2. **Overlay Type** — bottom-sheet (bottom-sheet | dialog | persistent-bar)
3. **Parent Screen** — health-log
4. **Trigger** — What user action opens this overlay (e.g., tap button, long press)
5. **Purpose** — What this overlay does and why it exists
6. **Widget Name** — `HealthLogEntry`
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

- `.stitch/designs/health-log-entry/SPEC.md` exists and has >30 lines
- All required sections present
- Overlay type and parent screen clearly identified
- Trigger and dismiss behavior documented
- Design tokens reference DESIGN.md values
