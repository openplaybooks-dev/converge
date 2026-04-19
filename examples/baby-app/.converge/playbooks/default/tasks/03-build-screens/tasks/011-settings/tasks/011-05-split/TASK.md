---
id: 011-05-split
title: "Split: Settings"
description: Extract widgets from Settings screen into local widgets/
dependencies:
  - 011-04-analyze
tags:
  - split
  - screen-settings
inputs:
  - .stitch/designs/settings/widgets.jsonl
outputs:
  - "lib/screens/settings/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 011
  screenId: settings
  title: Settings
  widgetName: Settings
  snakeName: settings
  route: /settings
  screenPath: lib/screens/settings/settings_screen.dart
  widgetsJsonPath: .stitch/designs/settings/widgets.jsonl
  localWidgetsDir: lib/screens/settings/widgets
  screenTaskId: 011-settings
  specPath: .stitch/designs/settings/SPEC.md
  metaPath: .stitch/designs/settings/META.md
  designPath: .stitch/designs/settings/design.html
  prevScreenLastId: 010-06-lift
---

# Split: Settings

Extract each widget identified in `.stitch/designs/settings/widgets.jsonl` into its own file under `lib/screens/settings/widgets/`.

For each widget:
1. Create `lib/screens/settings/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
