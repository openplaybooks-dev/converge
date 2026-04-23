---
id: 002-beacon-scanner
title: "Screen: Beacon Scanner"
dependencies:
  - 001-06-lift
tags:
  - screen
  - screen-beacon-scanner
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/beacon_scanner/beacon_scanner_screen.dart
vars:
  screenId: beacon-scanner
  screenTitle: Beacon Scanner
  widgetName: BeaconScanner
  route: /scan
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
---

Parent task for building the "Beacon Scanner" screen through the full pipeline: spec → design → convert → analyze → split → lift.
