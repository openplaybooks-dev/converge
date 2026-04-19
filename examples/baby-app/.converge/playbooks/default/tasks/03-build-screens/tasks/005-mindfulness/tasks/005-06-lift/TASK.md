---
id: 005-06-lift
title: "Lift: Mindfulness"
description: Lift shared widgets from Mindfulness to lib/widgets/
dependencies:
  - 005-05-split
blocking: true
tags:
  - lift
  - screen-mindfulness
inputs:
  - .stitch/designs/mindfulness/widgets.jsonl
  - "lib/screens/mindfulness/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Mindfulness

Examine each widget in `lib/screens/mindfulness/widgets/` that was marked `shared: true` in `.stitch/designs/mindfulness/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/mindfulness/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
