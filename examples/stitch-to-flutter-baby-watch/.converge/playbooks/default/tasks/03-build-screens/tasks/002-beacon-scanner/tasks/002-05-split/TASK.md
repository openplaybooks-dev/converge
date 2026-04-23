---
id: 002-05-split
title: "Split: Beacon Scanner"
description: Extract widgets from Beacon Scanner screen into local widgets/
dependencies:
  - 002-04-analyze
tags:
  - split
  - screen-beacon-scanner
inputs:
  - .stitch/designs/beacon-scanner/widgets.jsonl
outputs:
  - "lib/screens/beacon_scanner/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 002
  screenId: beacon-scanner
  title: Beacon Scanner
  widgetName: BeaconScanner
  snakeName: beacon_scanner
  route: /scan
  screenPath: lib/screens/beacon_scanner/beacon_scanner_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-scanner/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_scanner/widgets
  screenTaskId: 002-beacon-scanner
  specPath: .stitch/designs/beacon-scanner/SPEC.md
  metaPath: .stitch/designs/beacon-scanner/META.md
  designPath: .stitch/designs/beacon-scanner/design.html
  prevScreenLastId: 001-06-lift
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/code.html\"\n"
---

# Split: Beacon Scanner

Extract each widget identified in `.stitch/designs/beacon-scanner/widgets.jsonl` into its own file under `lib/screens/beacon_scanner/widgets/`.

For each widget:
1. Create `lib/screens/beacon_scanner/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
