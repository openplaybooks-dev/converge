---
id: 002-06-lift
title: "Lift: Beacon Scanner"
description: Lift shared widgets from Beacon Scanner to lib/widgets/
dependencies:
  - 002-05-split
blocking: true
tags:
  - lift
  - screen-beacon-scanner
inputs:
  - .stitch/designs/beacon-scanner/widgets.jsonl
  - "lib/screens/beacon_scanner/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Beacon Scanner

Examine each widget in `lib/screens/beacon_scanner/widgets/` that was marked `shared: true` in `.stitch/designs/beacon-scanner/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/beacon_scanner/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
