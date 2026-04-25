---
id: 004-06-lift
title: "Lift: Home — Alert"
description: Lift shared widgets from Home — Alert to lib/widgets/
dependencies:
  - 004-05-split
blocking: true
tags:
  - lift
  - screen-home-alert
inputs:
  - .stitch/designs/home-alert/widgets.jsonl
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 004
  screenId: home-alert
  title: Home — Alert
  widgetName: HomeAlert
  snakeName: home_alert
  route: /home
  screenPath: lib/screens/home_alert/home_alert_screen.dart
  widgetsJsonPath: .stitch/designs/home-alert/widgets.jsonl
  localWidgetsDir: lib/screens/home_alert/widgets
  screenTaskId: 004-home-alert
  specPath: .stitch/designs/home-alert/SPEC.md
  metaPath: .stitch/designs/home-alert/META.md
  designPath: .stitch/designs/home-alert/design.html
  linkedHtmlPath: .stitch/designs/home-alert/code.html
  statesPath: lib/screens/home_alert/home_alert_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_alert/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_alert/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_alert/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_alert/screen.png\"\n"
  prevScreenLastId: 003-07-states
  variant: alert
  variantGroup: home
---

# Lift: Home — Alert

Examine each widget in `lib/screens/home_alert/widgets/` that was marked `shared: true` in `.stitch/designs/home-alert/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/home_alert/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
