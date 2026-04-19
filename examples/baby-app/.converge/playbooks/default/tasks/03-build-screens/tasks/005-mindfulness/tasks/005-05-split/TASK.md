---
id: 005-05-split
title: "Split: Mindfulness"
description: Extract widgets from Mindfulness screen into local widgets/
dependencies:
  - 005-04-analyze
tags:
  - split
  - screen-mindfulness
inputs:
  - .stitch/designs/mindfulness/widgets.jsonl
outputs:
  - "lib/screens/mindfulness/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 005
  screenId: mindfulness
  title: Mindfulness
  widgetName: Mindfulness
  snakeName: mindfulness
  route: /mindfulness
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  widgetsJsonPath: .stitch/designs/mindfulness/widgets.jsonl
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenTaskId: 005-mindfulness
  specPath: .stitch/designs/mindfulness/SPEC.md
  metaPath: .stitch/designs/mindfulness/META.md
  designPath: .stitch/designs/mindfulness/design.html
  prevScreenLastId: 004-06-lift
---

# Split: Mindfulness

Extract each widget identified in `.stitch/designs/mindfulness/widgets.jsonl` into its own file under `lib/screens/mindfulness/widgets/`.

For each widget:
1. Create `lib/screens/mindfulness/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
