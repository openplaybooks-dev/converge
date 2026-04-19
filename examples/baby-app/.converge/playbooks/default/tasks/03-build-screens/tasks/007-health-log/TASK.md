---
id: 007-health-log
title: "Screen: Health Log"
dependencies:
  - 006-06-lift
tags:
  - screen
  - screen-health-log
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/health_log/health_log_screen.dart
vars:
  screenId: health-log
  screenTitle: Health Log
  widgetName: HealthLog
  route: /health-log
---

Parent task for building the "Health Log" screen through the full pipeline: spec → design → convert → analyze → split → lift.
