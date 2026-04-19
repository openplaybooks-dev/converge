---
id: 004-health-log-entry
title: "Overlay: Health Log Entry"
dependencies:
  - 003-05-mount
tags:
  - overlay
  - overlay-health-log-entry
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/health_log_entry/health_log_entry.dart
vars:
  overlayId: health-log-entry
  overlayTitle: Health Log Entry
  widgetName: HealthLogEntry
  parentScreenId: health-log
  overlayType: bottom-sheet
---

Parent task for building the "Health Log Entry" overlay: spec → design → convert → connect → mount.
