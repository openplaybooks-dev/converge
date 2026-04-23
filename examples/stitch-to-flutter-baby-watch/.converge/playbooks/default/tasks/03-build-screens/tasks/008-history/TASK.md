---
id: 008-history
title: "Screen: History"
dependencies:
  - 007-06-lift
tags:
  - screen
  - screen-history
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/history/history_screen.dart
vars:
  screenId: history
  screenTitle: History
  widgetName: History
  route: /history
  htmlReference: .stitch/references/history/code.html
---

Parent task for building the "History" screen through the full pipeline: spec → design → convert → analyze → split → lift.
