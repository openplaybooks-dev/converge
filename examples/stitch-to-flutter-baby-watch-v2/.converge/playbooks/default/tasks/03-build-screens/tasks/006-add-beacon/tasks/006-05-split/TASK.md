---
id: 006-05-split
title: "Split: Add Beacon"
description: Extract widgets from Add Beacon screen into local widgets/
dependencies:
  - 006-04-analyze
tags:
  - split
  - screen-add-beacon
inputs:
  - .stitch/designs/add-beacon/widgets.jsonl
outputs:
  - "lib/screens/add_beacon/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 006
  screenId: add-beacon
  title: Add Beacon
  widgetName: AddBeacon
  snakeName: add_beacon
  route: /devices/add
  screenPath: lib/screens/add_beacon/add_beacon_screen.dart
  widgetsJsonPath: .stitch/designs/add-beacon/widgets.jsonl
  localWidgetsDir: lib/screens/add_beacon/widgets
  screenTaskId: 006-add-beacon
  specPath: .stitch/designs/add-beacon/SPEC.md
  metaPath: .stitch/designs/add-beacon/META.md
  designPath: .stitch/designs/add-beacon/design.html
  linkedHtmlPath: .stitch/designs/add-beacon/code.html
  statesPath: lib/screens/add_beacon/add_beacon_states.dart
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/th_m_beacon_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/screen.png\"\n"
  prevScreenLastId: 005-07-states
  variant: 
  variantGroup: 
---

# Split: Add Beacon

Extract each widget identified in `.stitch/designs/add-beacon/widgets.jsonl` into its own file under `lib/screens/add_beacon/widgets/`.

For each widget:
1. Create `lib/screens/add_beacon/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
