---
id: 002-05-split
title: "Split: Cycle Tracking"
description: Extract widgets from Cycle Tracking screen into local widgets/
dependencies:
  - 002-04-analyze
tags:
  - split
  - screen-cycle-tracking
inputs:
  - .stitch/designs/cycle-tracking/widgets.jsonl
outputs:
  - "lib/screens/cycle_tracking/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 002
  screenId: cycle-tracking
  title: Cycle Tracking
  widgetName: CycleTracking
  snakeName: cycle_tracking
  route: /cycle
  screenPath: lib/screens/cycle_tracking/cycle_tracking_screen.dart
  widgetsJsonPath: .stitch/designs/cycle-tracking/widgets.jsonl
  localWidgetsDir: lib/screens/cycle_tracking/widgets
  screenTaskId: 002-cycle-tracking
  specPath: .stitch/designs/cycle-tracking/SPEC.md
  metaPath: .stitch/designs/cycle-tracking/META.md
  designPath: .stitch/designs/cycle-tracking/design.html
  prevScreenLastId: 001-06-lift
---

# Split: Cycle Tracking

Extract each widget identified in `.stitch/designs/cycle-tracking/widgets.jsonl` into its own file under `lib/screens/cycle_tracking/widgets/`.

For each widget:
1. Create `lib/screens/cycle_tracking/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
