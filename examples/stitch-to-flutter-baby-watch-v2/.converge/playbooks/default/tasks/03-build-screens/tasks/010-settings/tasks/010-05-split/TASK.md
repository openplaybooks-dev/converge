---
id: 010-05-split
title: "Split: Settings"
description: Extract widgets from Settings screen into local widgets/
dependencies:
  - 010-04-analyze
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

# Split: Settings

Extract each widget identified in `.stitch/designs/settings/widgets.jsonl` into its own file under `lib/screens/settings/widgets/`.

For each widget:
1. Create `lib/screens/settings/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
