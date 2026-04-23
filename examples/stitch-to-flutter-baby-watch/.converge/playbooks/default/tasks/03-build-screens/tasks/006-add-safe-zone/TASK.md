---
id: 006-add-safe-zone
title: "Screen: Add Safe Zone"
dependencies:
  - 005-06-lift
tags:
  - screen
  - screen-add-safe-zone
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/add_safe_zone/add_safe_zone_screen.dart
vars:
  screenId: add-safe-zone
  screenTitle: Add Safe Zone
  widgetName: AddSafeZone
  route: /safe-zones/add
  htmlReference: 
---

Parent task for building the "Add Safe Zone" screen through the full pipeline: spec → design → convert → analyze → split → lift.
