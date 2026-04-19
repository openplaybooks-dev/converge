---
id: 002-cycle-tracking
title: "Screen: Cycle Tracking"
dependencies:
  - 001-06-lift
tags:
  - screen
  - screen-cycle-tracking
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/cycle_tracking/cycle_tracking_screen.dart
vars:
  screenId: cycle-tracking
  screenTitle: Cycle Tracking
  widgetName: CycleTracking
  route: /cycle
---

Parent task for building the "Cycle Tracking" screen through the full pipeline: spec → design → convert → analyze → split → lift.
