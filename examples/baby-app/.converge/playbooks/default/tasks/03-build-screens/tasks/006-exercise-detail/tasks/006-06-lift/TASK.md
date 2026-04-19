---
id: 006-06-lift
title: "Lift: Exercise Detail"
description: Lift shared widgets from Exercise Detail to lib/widgets/
dependencies:
  - 006-05-split
blocking: true
tags:
  - lift
  - screen-exercise-detail
inputs:
  - .stitch/designs/exercise-detail/widgets.jsonl
  - "lib/screens/exercise_detail/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
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

# Lift: Exercise Detail

Examine each widget in `lib/screens/exercise_detail/widgets/` that was marked `shared: true` in `.stitch/designs/exercise-detail/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/exercise_detail/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
