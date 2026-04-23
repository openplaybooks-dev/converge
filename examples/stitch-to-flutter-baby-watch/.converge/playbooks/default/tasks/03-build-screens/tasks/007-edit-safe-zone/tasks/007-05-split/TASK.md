---
id: 007-05-split
title: "Split: Edit Safe Zone"
description: Extract widgets from Edit Safe Zone screen into local widgets/
dependencies:
  - 007-04-analyze
tags:
  - split
  - screen-edit-safe-zone
inputs:
  - .stitch/designs/edit-safe-zone/widgets.jsonl
outputs:
  - "lib/screens/edit_safe_zone/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 007
  screenId: edit-safe-zone
  title: Edit Safe Zone
  widgetName: EditSafeZone
  snakeName: edit_safe_zone
  route: "/safe-zones/:id/edit"
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  widgetsJsonPath: .stitch/designs/edit-safe-zone/widgets.jsonl
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenTaskId: 007-edit-safe-zone
  specPath: .stitch/designs/edit-safe-zone/SPEC.md
  metaPath: .stitch/designs/edit-safe-zone/META.md
  designPath: .stitch/designs/edit-safe-zone/design.html
  prevScreenLastId: 006-06-lift
  htmlReference: 
  htmlReferenceInput: 
---

# Split: Edit Safe Zone

Extract each widget identified in `.stitch/designs/edit-safe-zone/widgets.jsonl` into its own file under `lib/screens/edit_safe_zone/widgets/`.

For each widget:
1. Create `lib/screens/edit_safe_zone/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
