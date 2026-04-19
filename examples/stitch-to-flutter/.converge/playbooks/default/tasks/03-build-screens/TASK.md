---
id: 03-build-screens
title: Build Screens
description: Per-screen vertical pipeline — spec, design HTML, Flutter widgets, analyze, split, lift — for every screen in screens.json
references:
  - flutter-building-layouts
  - flutter-animating-apps
  - flutter-improving-accessibility
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
dependencies:
  - 02-design-system
tags:
  - screens
  - flutter
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
  - lib/router/app_router.dart
checks:
  - id: screens-json-exists
    cmd: test -f .stitch/screens.json
    description: Screen definitions exist
  - id: screens-created
    cmd: find lib/screens -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'
    description: At least one screen widget was created
  - id: dart-analysis-valid
    cmd: dart analyze lib/
    description: All generated code passes analysis
backlogs:
  - id: noop-buttons
    cmd: "grep -rn 'onPressed: null' lib/screens/ lib/widgets/ 2>/dev/null | grep -v 'disabled' || true"
    description: Buttons with null onPressed (non-functional)
    severity: high
  - id: placeholder-text
    cmd: "grep -rn 'Lorem\\|placeholder\\|TODO\\|FIXME\\|Coming soon\\|TBD' lib/screens/ lib/widgets/ 2>/dev/null || true"
    description: Placeholder or TODO text left in UI
    severity: medium
  - id: hardcoded-strings
    cmd: "grep -rn \"Text('.*[A-Z].*')\" lib/screens/ 2>/dev/null | head -20 || true"
    description: Hardcoded display strings in screens
    severity: low
---

# Build Screens

Reads `.stitch/screens.json` and spawns a 6-step pipeline per screen:

1. **Screen Specification** *(plan mode)* — explore DESIGN.md + UX.md + examples, output `.stitch/designs/{screenId}/SPEC.md` + `META.md`
2. **Generate HTML Design** — generate `.stitch/designs/{screenId}/design.html` using spec + meta
3. **Convert to Flutter Widgets** — transform HTML into `lib/screens/{screenId}/{screen_name}_screen.dart` with routing
4. **Analyze Widgets** — identify extractable widget regions in screen, write `.stitch/designs/{screenId}/widgets.jsonl`
5. **Split Widgets** — extract each widget from widgets.jsonl into local `_widgets/` folder (one subtask per widget via WBS)
6. **Lift Shared Widgets** — examine each local widget, lift sharable ones to `lib/widgets/`, keep screen-specific ones local

Screens are chained sequentially so each completes before the next begins.
