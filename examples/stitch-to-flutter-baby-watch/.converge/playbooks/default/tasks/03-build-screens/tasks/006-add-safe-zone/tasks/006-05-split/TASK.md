---
id: 006-05-split
title: "Split: Add Safe Zone"
description: Extract widgets from Add Safe Zone screen into local widgets/
dependencies:
  - 006-04-analyze
tags:
  - split
  - screen-add-safe-zone
inputs:
  - .stitch/designs/add-safe-zone/widgets.jsonl
outputs:
  - "lib/screens/add_safe_zone/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 006
  screenId: add-safe-zone
  title: Add Safe Zone
  widgetName: AddSafeZone
  snakeName: add_safe_zone
  route: /safe-zones/add
  screenPath: lib/screens/add_safe_zone/add_safe_zone_screen.dart
  widgetsJsonPath: .stitch/designs/add-safe-zone/widgets.jsonl
  localWidgetsDir: lib/screens/add_safe_zone/widgets
  screenTaskId: 006-add-safe-zone
  specPath: .stitch/designs/add-safe-zone/SPEC.md
  metaPath: .stitch/designs/add-safe-zone/META.md
  designPath: .stitch/designs/add-safe-zone/design.html
  prevScreenLastId: 005-06-lift
  htmlReference: 
  htmlReferenceInput: 
---

# Split: Add Safe Zone

Extract each widget identified in `.stitch/designs/add-safe-zone/widgets.jsonl` into its own file under `lib/screens/add_safe_zone/widgets/`.

For each widget:
1. Create `lib/screens/add_safe_zone/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
