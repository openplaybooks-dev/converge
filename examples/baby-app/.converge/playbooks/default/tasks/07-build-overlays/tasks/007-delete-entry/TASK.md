---
id: 007-delete-entry
title: "Overlay: Delete Entry Confirmation"
dependencies:
  - 006-05-mount
tags:
  - overlay
  - overlay-delete-entry
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/delete_entry/delete_entry.dart
vars:
  overlayId: delete-entry
  overlayTitle: Delete Entry Confirmation
  widgetName: DeleteEntry
  parentScreenId: health-log
  overlayType: dialog
---

Parent task for building the "Delete Entry Confirmation" overlay: spec → design → convert → connect → mount.
