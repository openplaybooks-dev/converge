---
id: 005-06-lift
title: "Lift: Safe Zones"
description: Lift shared widgets from Safe Zones to lib/widgets/
dependencies:
  - 005-05-split
blocking: true
tags:
  - lift
  - screen-safe-zones
inputs:
  - .stitch/designs/safe-zones/widgets.jsonl
  - "lib/screens/safe_zones/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 005
  screenId: safe-zones
  title: Safe Zones
  widgetName: SafeZones
  snakeName: safe_zones
  route: /safe-zones
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  widgetsJsonPath: .stitch/designs/safe-zones/widgets.jsonl
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenTaskId: 005-safe-zones
  specPath: .stitch/designs/safe-zones/SPEC.md
  metaPath: .stitch/designs/safe-zones/META.md
  designPath: .stitch/designs/safe-zones/design.html
  prevScreenLastId: 004-06-lift
  htmlReference: .stitch/references/safe_zones/code.html
  htmlReferenceInput: "  - \".stitch/references/safe_zones/code.html\"\n"
---

# Lift: Safe Zones

Examine each widget in `lib/screens/safe_zones/widgets/` that was marked `shared: true` in `.stitch/designs/safe-zones/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/safe_zones/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
