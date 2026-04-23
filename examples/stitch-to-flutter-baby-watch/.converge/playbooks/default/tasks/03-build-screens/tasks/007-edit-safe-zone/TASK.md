---
id: 007-edit-safe-zone
title: "Screen: Edit Safe Zone"
dependencies:
  - 006-06-lift
tags:
  - screen
  - screen-edit-safe-zone
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
vars:
  screenId: edit-safe-zone
  screenTitle: Edit Safe Zone
  widgetName: EditSafeZone
  route: "/safe-zones/:id/edit"
  htmlReference: 
---

Parent task for building the "Edit Safe Zone" screen through the full pipeline: spec → design → convert → analyze → split → lift.
