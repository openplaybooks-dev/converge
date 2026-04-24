---
id: 004-06-lift
title: "Lift: Edit Beacon"
description: Lift shared widgets from Edit Beacon to lib/widgets/
dependencies:
  - 004-05-split
blocking: true
tags:
  - lift
  - screen-beacon-edit
inputs:
  - .stitch/designs/beacon-edit/widgets.jsonl
  - "lib/screens/beacon_edit/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Edit Beacon

Examine each widget in `lib/screens/beacon_edit/widgets/` that was marked `shared: true` in `.stitch/designs/beacon-edit/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/beacon_edit/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
