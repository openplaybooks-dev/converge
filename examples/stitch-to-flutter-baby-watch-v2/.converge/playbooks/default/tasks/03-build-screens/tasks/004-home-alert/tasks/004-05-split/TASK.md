---
id: 004-05-split
title: "Split: Home — Alert"
description: Extract widgets from Home — Alert screen into local widgets/
dependencies:
  - 004-04-analyze
tags:
  - split
  - screen-home-alert
inputs:
  - .stitch/designs/home-alert/widgets.jsonl
outputs:
  - "lib/screens/home_alert/widgets/**/*.dart"
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

# Split: Home — Alert

Extract each widget identified in `.stitch/designs/home-alert/widgets.jsonl` into its own file under `lib/screens/home_alert/widgets/`.

For each widget:
1. Create `lib/screens/home_alert/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
