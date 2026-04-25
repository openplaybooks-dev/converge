---
id: 005-06-lift
title: "Lift: Beacon Detail"
description: Lift shared widgets from Beacon Detail to lib/widgets/
dependencies:
  - 005-05-split
blocking: true
tags:
  - lift
  - screen-beacon-detail
inputs:
  - .stitch/designs/beacon-detail/widgets.jsonl
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 005
  screenId: beacon-detail
  title: Beacon Detail
  widgetName: BeaconDetail
  snakeName: beacon_detail
  route: /devices
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-detail/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenTaskId: 005-beacon-detail
  specPath: .stitch/designs/beacon-detail/SPEC.md
  metaPath: .stitch/designs/beacon-detail/META.md
  designPath: .stitch/designs/beacon-detail/design.html
  linkedHtmlPath: .stitch/designs/beacon-detail/code.html
  statesPath: lib/screens/beacon_detail/beacon_detail_states.dart
  htmlReference: .stitch/references/chi_ti_t_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/chi_ti_t_beacon_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/chi_ti_t_beacon_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/chi_ti_t_beacon_phase_2/screen.png\"\n"
  prevScreenLastId: 004-07-states
  variant: 
  variantGroup: 
---

# Lift: Beacon Detail

Examine each widget in `lib/screens/beacon_detail/widgets/` that was marked `shared: true` in `.stitch/designs/beacon-detail/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/beacon_detail/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
