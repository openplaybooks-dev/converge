---
id: 002-01-spec
title: "Spec: Cycle Tracking"
description: Generate Cycle Tracking screen specification
tags:
  - spec
  - screen-cycle-tracking
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/designs/cycle-tracking/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for cycle-tracking
    cmd: test -f .stitch/designs/cycle-tracking/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/cycle-tracking/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
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

# Spec: Cycle Tracking

Generate the screen specification for **Cycle Tracking** (`/cycle`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `.stitch/designs/cycle-tracking/SPEC.md` containing:

1. **Screen Title** — Cycle Tracking
2. **Purpose** — What this screen does and why
3. **Route** — `/cycle`
4. **Widget Name** — `CycleTrackingScreen`
5. **Design Tokens** — Colors, typography, spacing from DESIGN.md
6. **Layout Rules** — Scaffold structure, app bar, body, bottom nav
7. **Sections** — Each visual section with:
   - Description of content
   - Widget type (ListView, GridView, Column, etc.)
   - Data requirements
   - Interactive elements
8. **Data** — Entities and fields displayed on this screen
9. **Motion** — Entry animations, transitions, hero animations
10. **Accessibility** — Semantics labels, focus order, contrast notes
11. **Anti-Patterns** — Things to avoid

## Success Criteria

- `.stitch/designs/cycle-tracking/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
