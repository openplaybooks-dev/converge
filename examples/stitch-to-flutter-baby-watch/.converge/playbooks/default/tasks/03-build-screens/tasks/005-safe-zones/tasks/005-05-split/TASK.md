---
id: 005-05-split
title: "Split: Safe Zones"
description: Extract widgets from Safe Zones screen into local widgets/
dependencies:
  - 005-04-analyze
tags:
  - split
  - screen-safe-zones
inputs:
  - .stitch/designs/safe-zones/widgets.jsonl
outputs:
  - "lib/screens/safe_zones/widgets/**/*.dart"
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

# Split: Safe Zones

Extract each widget identified in `.stitch/designs/safe-zones/widgets.jsonl` into its own file under `lib/screens/safe_zones/widgets/`.

For each widget:
1. Create `lib/screens/safe_zones/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
