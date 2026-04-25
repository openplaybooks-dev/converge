---
id: 010-06-lift
title: "Lift: Settings"
description: Lift shared widgets from Settings to lib/widgets/
dependencies:
  - 010-05-split
blocking: true
tags:
  - lift
  - screen-settings
inputs:
  - .stitch/designs/settings/widgets.jsonl
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 010
  screenId: settings
  title: Settings
  widgetName: Settings
  snakeName: settings
  route: /settings
  screenPath: lib/screens/settings/settings_screen.dart
  widgetsJsonPath: .stitch/designs/settings/widgets.jsonl
  localWidgetsDir: lib/screens/settings/widgets
  screenTaskId: 010-settings
  specPath: .stitch/designs/settings/SPEC.md
  metaPath: .stitch/designs/settings/META.md
  designPath: .stitch/designs/settings/design.html
  linkedHtmlPath: .stitch/designs/settings/code.html
  statesPath: lib/screens/settings/settings_states.dart
  htmlReference: .stitch/references/settings/code.html
  htmlReferenceInput: "  - \".stitch/references/settings/code.html\"\n"
  screenshotReference: .stitch/references/settings/screen.png
  screenshotReferenceInput: "  - \".stitch/references/settings/screen.png\"\n"
  prevScreenLastId: 009-07-states
  variant: 
  variantGroup: 
---

# Lift: Settings

Examine each widget in `lib/screens/settings/widgets/` that was marked `shared: true` in `.stitch/designs/settings/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/settings/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
