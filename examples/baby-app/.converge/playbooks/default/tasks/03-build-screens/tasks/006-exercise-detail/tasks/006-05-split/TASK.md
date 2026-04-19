---
id: 006-05-split
title: "Split: Exercise Detail"
description: Extract widgets from Exercise Detail screen into local widgets/
dependencies:
  - 006-04-analyze
tags:
  - split
  - screen-exercise-detail
inputs:
  - .stitch/designs/exercise-detail/widgets.jsonl
outputs:
  - "lib/screens/exercise_detail/widgets/**/*.dart"
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

# Split: Exercise Detail

Extract each widget identified in `.stitch/designs/exercise-detail/widgets.jsonl` into its own file under `lib/screens/exercise_detail/widgets/`.

For each widget:
1. Create `lib/screens/exercise_detail/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
