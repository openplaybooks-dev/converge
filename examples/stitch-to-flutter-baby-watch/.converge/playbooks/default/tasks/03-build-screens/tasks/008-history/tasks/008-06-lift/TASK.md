---
id: 008-06-lift
title: "Lift: History"
description: Lift shared widgets from History to lib/widgets/
dependencies:
  - 008-05-split
blocking: true
tags:
  - lift
  - screen-history
inputs:
  - .stitch/designs/history/widgets.jsonl
  - "lib/screens/history/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 008
  screenId: history
  title: History
  widgetName: History
  snakeName: history
  route: /history
  screenPath: lib/screens/history/history_screen.dart
  widgetsJsonPath: .stitch/designs/history/widgets.jsonl
  localWidgetsDir: lib/screens/history/widgets
  screenTaskId: 008-history
  specPath: .stitch/designs/history/SPEC.md
  metaPath: .stitch/designs/history/META.md
  designPath: .stitch/designs/history/design.html
  prevScreenLastId: 007-06-lift
  htmlReference: .stitch/references/history/code.html
  htmlReferenceInput: "  - \".stitch/references/history/code.html\"\n"
---

# Lift: History

Examine each widget in `lib/screens/history/widgets/` that was marked `shared: true` in `.stitch/designs/history/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/history/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
