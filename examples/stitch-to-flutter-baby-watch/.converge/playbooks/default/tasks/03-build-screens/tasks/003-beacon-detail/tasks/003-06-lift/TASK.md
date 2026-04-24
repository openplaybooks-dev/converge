---
id: 003-06-lift
title: "Lift: Beacon Detail"
description: Lift shared widgets from Beacon Detail to lib/widgets/
dependencies:
  - 003-05-split
blocking: true
tags:
  - lift
  - screen-beacon-detail
inputs:
  - .stitch/designs/beacon-detail/widgets.jsonl
  - "lib/screens/beacon_detail/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 003
  screenId: beacon-detail
  title: Beacon Detail
  widgetName: BeaconDetail
  snakeName: beacon_detail
  route: "/beacon/:id"
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-detail/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenTaskId: 003-beacon-detail
  specPath: .stitch/designs/beacon-detail/SPEC.md
  metaPath: .stitch/designs/beacon-detail/META.md
  designPath: .stitch/designs/beacon-detail/design.html
  prevScreenLastId: 002-06-lift
  htmlReference: .stitch/references/chi_ti_t_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/chi_ti_t_beacon_phase_2/code.html\"\n"
---

# Lift: Beacon Detail

Examine each widget in `lib/screens/beacon_detail/widgets/` that was marked `shared: true` in `.stitch/designs/beacon-detail/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/beacon_detail/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
