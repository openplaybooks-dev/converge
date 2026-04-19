---
id: 007-05-split
title: "Split: Health Log"
description: Extract widgets from Health Log screen into local widgets/
dependencies:
  - 007-04-analyze
tags:
  - split
  - screen-health-log
inputs:
  - .stitch/designs/health-log/widgets.jsonl
outputs:
  - "lib/screens/health_log/widgets/**/*.dart"
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

# Split: Health Log

Extract each widget identified in `.stitch/designs/health-log/widgets.jsonl` into its own file under `lib/screens/health_log/widgets/`.

For each widget:
1. Create `lib/screens/health_log/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
