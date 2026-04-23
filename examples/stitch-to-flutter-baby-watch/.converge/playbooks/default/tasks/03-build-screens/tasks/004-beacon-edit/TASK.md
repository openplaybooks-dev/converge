---
id: 004-beacon-edit
title: "Screen: Edit Beacon"
dependencies:
  - 003-06-lift
tags:
  - screen
  - screen-beacon-edit
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/beacon_edit/beacon_edit_screen.dart
vars:
  screenId: beacon-edit
  screenTitle: Edit Beacon
  widgetName: BeaconEdit
  route: "/beacon/:id/edit"
  htmlReference: 
---

Parent task for building the "Edit Beacon" screen through the full pipeline: spec → design → convert → analyze → split → lift.
