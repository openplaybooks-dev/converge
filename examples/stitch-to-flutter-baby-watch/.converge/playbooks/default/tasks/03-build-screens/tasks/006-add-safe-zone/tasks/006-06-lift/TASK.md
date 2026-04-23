---
id: 006-06-lift
title: "Lift: Add Safe Zone"
description: Lift shared widgets from Add Safe Zone to lib/widgets/
dependencies:
  - 006-05-split
blocking: true
tags:
  - lift
  - screen-add-safe-zone
inputs:
  - .stitch/designs/add-safe-zone/widgets.jsonl
  - "lib/screens/add_safe_zone/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Add Safe Zone

Examine each widget in `lib/screens/add_safe_zone/widgets/` that was marked `shared: true` in `.stitch/designs/add-safe-zone/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/add_safe_zone/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
