---
id: 004-05-split
title: "Split: Pregnancy Progress"
description: Extract widgets from Pregnancy Progress screen into local widgets/
dependencies:
  - 004-04-analyze
tags:
  - split
  - screen-pregnancy-progress
inputs:
  - .stitch/designs/pregnancy-progress/widgets.jsonl
outputs:
  - "lib/screens/pregnancy_progress/widgets/**/*.dart"
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

# Split: Pregnancy Progress

Extract each widget identified in `.stitch/designs/pregnancy-progress/widgets.jsonl` into its own file under `lib/screens/pregnancy_progress/widgets/`.

For each widget:
1. Create `lib/screens/pregnancy_progress/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
