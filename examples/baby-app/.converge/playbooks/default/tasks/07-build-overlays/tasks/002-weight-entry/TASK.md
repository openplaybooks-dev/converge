---
id: 002-weight-entry
title: "Overlay: Weight Entry"
dependencies:
  - 001-05-mount
tags:
  - overlay
  - overlay-weight-entry
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/weight_entry/weight_entry.dart
vars:
  overlayId: weight-entry
  overlayTitle: Weight Entry
  widgetName: WeightEntry
  parentScreenId: weight-nutrition
  overlayType: bottom-sheet
---

Parent task for building the "Weight Entry" overlay: spec → design → convert → connect → mount.
