---
id: 007-06-lift
title: "Lift: Health Log"
description: Lift shared widgets from Health Log to lib/widgets/
dependencies:
  - 007-05-split
blocking: true
tags:
  - lift
  - screen-health-log
inputs:
  - .stitch/designs/health-log/widgets.jsonl
  - "lib/screens/health_log/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 007
  screenId: health-log
  title: Health Log
  widgetName: HealthLog
  snakeName: health_log
  route: /health-log
  screenPath: lib/screens/health_log/health_log_screen.dart
  widgetsJsonPath: .stitch/designs/health-log/widgets.jsonl
  localWidgetsDir: lib/screens/health_log/widgets
  screenTaskId: 007-health-log
  specPath: .stitch/designs/health-log/SPEC.md
  metaPath: .stitch/designs/health-log/META.md
  designPath: .stitch/designs/health-log/design.html
  prevScreenLastId: 006-06-lift
---

# Lift: Health Log

Examine each widget in `lib/screens/health_log/widgets/` that was marked `shared: true` in `.stitch/designs/health-log/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/health_log/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
