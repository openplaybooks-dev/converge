---
id: 07-build-overlays
title: Build Overlays — Spec, Design, Convert, Connect, Mount
description: Per-overlay pipeline for dynamic views (bottom sheets, dialogs, persistent bars)
references:
  - flutter-implementing-navigation-and-routing
  - flutter-animating-apps
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
dependencies:
  - 03-build-screens
tags:
  - overlays
  - flutter
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/widgets/overlays/**/*.dart
checks:
  - id: overlays-created
    cmd: find lib/widgets/overlays -name '*.dart' 2>/dev/null | wc -l | awk '{if ($1 >= 2) exit 0; exit 1}'
    description: At least 2 overlay widgets were created
  - id: dart-analysis-valid
    cmd: dart analyze --no-fatal-infos lib/
    description: All generated code passes analysis
---

# Build Overlays

Reads `.stitch/screens.json` and spawns a 5-step pipeline per overlay screen (`route.startsWith('overlay:')`):

1. **Overlay Specification** *(plan mode)* — explore parent screen spec + DESIGN.md + UX.md, output `.stitch/designs/{overlayId}/SPEC.md`
2. **Generate HTML Design** — generate `.stitch/designs/{overlayId}/design.html` using spec + meta
3. **Convert to Flutter Widget** — transform HTML into `lib/widgets/overlays/{id}/{widget_name}.dart`
4. **Connect Provider** — wire Riverpod provider, add missing actions, connect interactive controls
5. **Mount in Parent** — mount overlay in parent screen, wire trigger callbacks (showModalBottomSheet, showDialog)

Overlays are chained sequentially so each completes before the next begins.
