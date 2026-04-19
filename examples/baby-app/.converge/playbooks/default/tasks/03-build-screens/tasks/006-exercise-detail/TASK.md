---
id: 006-exercise-detail
title: "Screen: Exercise Detail"
dependencies:
  - 005-06-lift
tags:
  - screen
  - screen-exercise-detail
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/exercise_detail/exercise_detail_screen.dart
vars:
  screenId: exercise-detail
  screenTitle: Exercise Detail
  widgetName: ExerciseDetail
  route: "/mindfulness/exercise/:id"
---

Parent task for building the "Exercise Detail" screen through the full pipeline: spec → design → convert → analyze → split → lift.
