---
id: 007-01-spec
title: "Spec: Health Log"
description: Generate Health Log screen specification
tags:
  - spec
  - screen-health-log
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/designs/health-log/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for health-log
    cmd: test -f .stitch/designs/health-log/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/health-log/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 007
  screenId: health-log
  title: Health Log
  widgetName: HealthLog
  snakeName: health_log
  route: /health-log
  screenPath: lib/screens/health_log/health_log_screen.dart
  widgetsJsonPath: .stitch/designs/health-log/widgets.jsonl
  localWidgetsDir: lib/screens/health_log/widgets
  screenTaskId: 007-health-log
  specPath: .stitch/designs/health-log/SPEC.md
  metaPath: .stitch/designs/health-log/META.md
  designPath: .stitch/designs/health-log/design.html
  prevScreenLastId: 006-06-lift
---

# Spec: Health Log

Generate the screen specification for **Health Log** (`/health-log`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `.stitch/designs/health-log/SPEC.md` containing:

1. **Screen Title** — Health Log
2. **Purpose** — What this screen does and why
3. **Route** — `/health-log`
4. **Widget Name** — `HealthLogScreen`
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

- `.stitch/designs/health-log/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
