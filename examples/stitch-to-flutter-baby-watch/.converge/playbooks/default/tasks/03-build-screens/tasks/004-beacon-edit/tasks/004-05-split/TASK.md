---
id: 004-05-split
title: "Split: Edit Beacon"
description: Extract widgets from Edit Beacon screen into local widgets/
dependencies:
  - 004-04-analyze
tags:
  - split
  - screen-beacon-edit
inputs:
  - .stitch/designs/beacon-edit/widgets.jsonl
outputs:
  - "lib/screens/beacon_edit/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 004
  screenId: beacon-edit
  title: Edit Beacon
  widgetName: BeaconEdit
  snakeName: beacon_edit
  route: "/beacon/:id/edit"
  screenPath: lib/screens/beacon_edit/beacon_edit_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-edit/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_edit/widgets
  screenTaskId: 004-beacon-edit
  specPath: .stitch/designs/beacon-edit/SPEC.md
  metaPath: .stitch/designs/beacon-edit/META.md
  designPath: .stitch/designs/beacon-edit/design.html
  prevScreenLastId: 003-06-lift
  htmlReference: 
  htmlReferenceInput: 
---

# Split: Edit Beacon

Extract each widget identified in `.stitch/designs/beacon-edit/widgets.jsonl` into its own file under `lib/screens/beacon_edit/widgets/`.

For each widget:
1. Create `lib/screens/beacon_edit/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
