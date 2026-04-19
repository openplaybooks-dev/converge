---
id: 003-mood-log
title: "Overlay: Mood Logging"
dependencies:
  - 002-05-mount
tags:
  - overlay
  - overlay-mood-log
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/mood_log/mood_log.dart
vars:
  overlayId: mood-log
  overlayTitle: Mood Logging
  widgetName: MoodLog
  parentScreenId: mood-wellness
  overlayType: bottom-sheet
---

Parent task for building the "Mood Logging" overlay: spec → design → convert → connect → mount.
