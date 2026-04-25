---
id: 009-05-split
title: "Split: History"
description: Extract widgets from History screen into local widgets/
dependencies:
  - 009-04-analyze
tags:
  - split
  - screen-history
inputs:
  - .stitch/designs/history/widgets.jsonl
outputs:
  - "lib/screens/history/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 009
  screenId: history
  title: History
  widgetName: History
  snakeName: history
  route: /history
  screenPath: lib/screens/history/history_screen.dart
  widgetsJsonPath: .stitch/designs/history/widgets.jsonl
  localWidgetsDir: lib/screens/history/widgets
  screenTaskId: 009-history
  specPath: .stitch/designs/history/SPEC.md
  metaPath: .stitch/designs/history/META.md
  designPath: .stitch/designs/history/design.html
  linkedHtmlPath: .stitch/designs/history/code.html
  statesPath: lib/screens/history/history_states.dart
  htmlReference: .stitch/references/history/code.html
  htmlReferenceInput: "  - \".stitch/references/history/code.html\"\n"
  screenshotReference: .stitch/references/history/screen.png
  screenshotReferenceInput: "  - \".stitch/references/history/screen.png\"\n"
  prevScreenLastId: 008-07-states
  variant: 
  variantGroup: 
---

# Split: History

Extract each widget identified in `.stitch/designs/history/widgets.jsonl` into its own file under `lib/screens/history/widgets/`.

For each widget:
1. Create `lib/screens/history/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
