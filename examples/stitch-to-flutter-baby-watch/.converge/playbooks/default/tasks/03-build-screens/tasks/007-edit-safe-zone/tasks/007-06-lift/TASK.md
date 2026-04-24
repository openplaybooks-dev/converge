---
id: 007-06-lift
title: "Lift: Edit Safe Zone"
description: Lift shared widgets from Edit Safe Zone to lib/widgets/
dependencies:
  - 007-05-split
blocking: true
tags:
  - lift
  - screen-edit-safe-zone
inputs:
  - .stitch/designs/edit-safe-zone/widgets.jsonl
  - "lib/screens/edit_safe_zone/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Edit Safe Zone

Examine each widget in `lib/screens/edit_safe_zone/widgets/` that was marked `shared: true` in `.stitch/designs/edit-safe-zone/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/edit_safe_zone/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
