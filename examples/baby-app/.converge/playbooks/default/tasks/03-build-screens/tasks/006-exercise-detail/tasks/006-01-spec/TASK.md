---
id: 006-01-spec
title: "Spec: Exercise Detail"
description: Generate Exercise Detail screen specification
tags:
  - spec
  - screen-exercise-detail
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/designs/exercise-detail/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for exercise-detail
    cmd: test -f .stitch/designs/exercise-detail/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/exercise-detail/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 006
  screenId: exercise-detail
  title: Exercise Detail
  widgetName: ExerciseDetail
  snakeName: exercise_detail
  route: "/mindfulness/exercise/:id"
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  widgetsJsonPath: .stitch/designs/exercise-detail/widgets.jsonl
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenTaskId: 006-exercise-detail
  specPath: .stitch/designs/exercise-detail/SPEC.md
  metaPath: .stitch/designs/exercise-detail/META.md
  designPath: .stitch/designs/exercise-detail/design.html
  prevScreenLastId: 005-06-lift
---

# Spec: Exercise Detail

Generate the screen specification for **Exercise Detail** (`/mindfulness/exercise/:id`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `.stitch/designs/exercise-detail/SPEC.md` containing:

1. **Screen Title** — Exercise Detail
2. **Purpose** — What this screen does and why
3. **Route** — `/mindfulness/exercise/:id`
4. **Widget Name** — `ExerciseDetailScreen`
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

- `.stitch/designs/exercise-detail/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
