---
id: 001-06-lift
title: "Lift: Home"
description: Lift shared widgets from Home to lib/widgets/
dependencies:
  - 001-05-split
blocking: true
tags:
  - lift
  - screen-home
inputs:
  - .stitch/designs/home/widgets.jsonl
  - "lib/screens/home/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 001
  screenId: home
  title: Home
  widgetName: Home
  snakeName: home
  route: /
  screenPath: lib/screens/home/home_screen.dart
  widgetsJsonPath: .stitch/designs/home/widgets.jsonl
  localWidgetsDir: lib/screens/home/widgets
  screenTaskId: 001-home
  specPath: .stitch/designs/home/SPEC.md
  metaPath: .stitch/designs/home/META.md
  designPath: .stitch/designs/home/design.html
  prevScreenLastId: 
  htmlReference: .stitch/references/babyguard_home_phase_2_safe_updated/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/code.html\"\n"
---

# Lift: Home

Examine each widget in `lib/screens/home/widgets/` that was marked `shared: true` in `.stitch/designs/home/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/home/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
