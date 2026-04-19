---
id: 004-06-lift
title: "Lift: Pregnancy Progress"
description: Lift shared widgets from Pregnancy Progress to lib/widgets/
dependencies:
  - 004-05-split
blocking: true
tags:
  - lift
  - screen-pregnancy-progress
inputs:
  - .stitch/designs/pregnancy-progress/widgets.jsonl
  - "lib/screens/pregnancy_progress/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 004
  screenId: pregnancy-progress
  title: Pregnancy Progress
  widgetName: PregnancyProgress
  snakeName: pregnancy_progress
  route: /progress
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  widgetsJsonPath: .stitch/designs/pregnancy-progress/widgets.jsonl
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenTaskId: 004-pregnancy-progress
  specPath: .stitch/designs/pregnancy-progress/SPEC.md
  metaPath: .stitch/designs/pregnancy-progress/META.md
  designPath: .stitch/designs/pregnancy-progress/design.html
  prevScreenLastId: 003-06-lift
---

# Lift: Pregnancy Progress

Examine each widget in `lib/screens/pregnancy_progress/widgets/` that was marked `shared: true` in `.stitch/designs/pregnancy-progress/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/pregnancy_progress/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
