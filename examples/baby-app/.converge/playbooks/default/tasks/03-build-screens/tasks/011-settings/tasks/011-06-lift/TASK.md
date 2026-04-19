---
id: 011-06-lift
title: "Lift: Settings"
description: Lift shared widgets from Settings to lib/widgets/
dependencies:
  - 011-05-split
blocking: true
tags:
  - lift
  - screen-settings
inputs:
  - .stitch/designs/settings/widgets.jsonl
  - "lib/screens/settings/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Settings

Examine each widget in `lib/screens/settings/widgets/` that was marked `shared: true` in `.stitch/designs/settings/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/settings/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
