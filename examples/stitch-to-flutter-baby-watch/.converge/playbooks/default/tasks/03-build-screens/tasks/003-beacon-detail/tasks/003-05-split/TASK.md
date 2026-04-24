---
id: 003-05-split
title: "Split: Beacon Detail"
description: Extract widgets from Beacon Detail screen into local widgets/
dependencies:
  - 003-04-analyze
tags:
  - split
  - screen-beacon-detail
inputs:
  - .stitch/designs/beacon-detail/widgets.jsonl
outputs:
  - "lib/screens/beacon_detail/widgets/**/*.dart"
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

# Split: Beacon Detail

Extract each widget identified in `.stitch/designs/beacon-detail/widgets.jsonl` into its own file under `lib/screens/beacon_detail/widgets/`.

For each widget:
1. Create `lib/screens/beacon_detail/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
