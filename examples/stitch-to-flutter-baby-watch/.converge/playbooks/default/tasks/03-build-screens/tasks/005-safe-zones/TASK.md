---
id: 005-safe-zones
title: "Screen: Safe Zones"
dependencies:
  - 004-06-lift
tags:
  - screen
  - screen-safe-zones
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/safe_zones/safe_zones_screen.dart
vars:
  screenId: safe-zones
  screenTitle: Safe Zones
  widgetName: SafeZones
  route: /safe-zones
  htmlReference: .stitch/references/safe_zones/code.html
---

Parent task for building the "Safe Zones" screen through the full pipeline: spec → design → convert → analyze → split → lift.
