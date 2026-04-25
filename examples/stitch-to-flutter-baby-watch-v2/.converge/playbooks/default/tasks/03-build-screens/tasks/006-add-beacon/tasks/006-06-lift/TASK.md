---
id: 006-06-lift
title: "Lift: Add Beacon"
description: Lift shared widgets from Add Beacon to lib/widgets/
dependencies:
  - 006-05-split
blocking: true
tags:
  - lift
  - screen-add-beacon
inputs:
  - .stitch/designs/add-beacon/widgets.jsonl
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Add Beacon

Examine each widget in `lib/screens/add_beacon/widgets/` that was marked `shared: true` in `.stitch/designs/add-beacon/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/add_beacon/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
