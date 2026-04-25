---
id: 003-timeout-picker
title: "Overlay: Timeout Picker"
dependencies:
  - 002-05-mount
tags:
  - overlay
  - overlay-timeout-picker
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/timeout_picker/timeout_picker.dart
vars:
  overlayId: timeout-picker
  overlayTitle: Timeout Picker
  widgetName: TimeoutPicker
  parentScreenId: 
  overlayType: bottom-sheet
---

Parent task for building the "Timeout Picker" overlay: spec → design → convert → connect → mount.
