---
id: 002-06-lift
title: "Lift: Cycle Tracking"
description: Lift shared widgets from Cycle Tracking to lib/widgets/
dependencies:
  - 002-05-split
blocking: true
tags:
  - lift
  - screen-cycle-tracking
inputs:
  - .stitch/designs/cycle-tracking/widgets.jsonl
  - "lib/screens/cycle_tracking/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Cycle Tracking

Examine each widget in `lib/screens/cycle_tracking/widgets/` that was marked `shared: true` in `.stitch/designs/cycle-tracking/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/cycle_tracking/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
