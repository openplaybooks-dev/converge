---
id: 004-pregnancy-progress
title: "Screen: Pregnancy Progress"
dependencies:
  - 003-06-lift
tags:
  - screen
  - screen-pregnancy-progress
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
vars:
  screenId: pregnancy-progress
  screenTitle: Pregnancy Progress
  widgetName: PregnancyProgress
  route: /progress
---

Parent task for building the "Pregnancy Progress" screen through the full pipeline: spec → design → convert → analyze → split → lift.
