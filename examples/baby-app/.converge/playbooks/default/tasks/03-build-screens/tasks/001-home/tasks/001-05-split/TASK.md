---
id: 001-05-split
title: "Split: Home"
description: Extract widgets from Home screen into local widgets/
dependencies:
  - 001-04-analyze
tags:
  - split
  - screen-home
inputs:
  - .stitch/designs/home/widgets.jsonl
outputs:
  - "lib/screens/home/_widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 001
  screenId: home
  title: Home
  widgetName: Home
  snakeName: home
  route: /home
  screenPath: lib/screens/home/home_screen.dart
  widgetsJsonPath: .stitch/designs/home/widgets.jsonl
  localWidgetsDir: lib/screens/home/widgets
  screenTaskId: 001-home
  specPath: .stitch/designs/home/SPEC.md
  metaPath: .stitch/designs/home/META.md
  designPath: .stitch/designs/home/design.html
  prevScreenLastId: 
---

# Split: Home

Extract each widget identified in `.stitch/designs/home/widgets.jsonl` into its own file under `lib/screens/home/widgets/`.

For each widget:
1. Create `lib/screens/home/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
