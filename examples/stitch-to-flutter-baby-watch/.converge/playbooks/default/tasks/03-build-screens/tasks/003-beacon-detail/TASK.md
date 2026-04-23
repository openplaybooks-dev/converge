---
id: 003-beacon-detail
title: "Screen: Beacon Detail"
dependencies:
  - 002-06-lift
tags:
  - screen
  - screen-beacon-detail
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/beacon_detail/beacon_detail_screen.dart
  - lib/screens/beacon_detail/widgets
vars:
  screenId: beacon-detail
  screenTitle: Beacon Detail
  widgetName: BeaconDetail
  route: "/beacon/:id"
  htmlReference: .stitch/references/chi_ti_t_beacon_phase_2/code.html
---

Parent task for building the "Beacon Detail" screen through the full pipeline: spec → design → convert → analyze → split → lift.
