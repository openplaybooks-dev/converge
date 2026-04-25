---
id: 006-test-alert
title: "Overlay: Test Alert Countdown"
dependencies:
  - 005-05-mount
tags:
  - overlay
  - overlay-test-alert
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/test_alert/test_alert.dart
vars:
  overlayId: test-alert
  overlayTitle: Test Alert Countdown
  widgetName: TestAlert
  parentScreenId: 
  overlayType: bottom-sheet
---

Parent task for building the "Test Alert Countdown" overlay: spec → design → convert → connect → mount.
