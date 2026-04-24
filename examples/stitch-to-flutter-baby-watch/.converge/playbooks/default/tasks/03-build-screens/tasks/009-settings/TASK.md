---
id: 009-settings
title: "Screen: Settings"
dependencies:
  - 008-06-lift
tags:
  - screen
  - screen-settings
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/settings/settings_screen.dart
vars:
  screenId: settings
  screenTitle: Settings
  widgetName: Settings
  route: /settings
  htmlReference: .stitch/references/settings/code.html
---

Parent task for building the "Settings" screen through the full pipeline: spec → design → convert → analyze → split → lift.
