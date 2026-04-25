---
id: 002-06-lift
title: "Lift: Home — Safe"
description: Lift shared widgets from Home — Safe to lib/widgets/
dependencies:
  - 002-05-split
blocking: true
tags:
  - lift
  - screen-home-safe
inputs:
  - .stitch/designs/home-safe/widgets.jsonl
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 002
  screenId: home-safe
  title: Home — Safe
  widgetName: HomeSafe
  snakeName: home_safe
  route: /home
  screenPath: lib/screens/home_safe/home_safe_screen.dart
  widgetsJsonPath: .stitch/designs/home-safe/widgets.jsonl
  localWidgetsDir: lib/screens/home_safe/widgets
  screenTaskId: 002-home-safe
  specPath: .stitch/designs/home-safe/SPEC.md
  metaPath: .stitch/designs/home-safe/META.md
  designPath: .stitch/designs/home-safe/design.html
  linkedHtmlPath: .stitch/designs/home-safe/code.html
  statesPath: lib/screens/home_safe/home_safe_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_safe_updated/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_safe_updated/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/screen.png\"\n"
  prevScreenLastId: 001-07-states
  variant: safe
  variantGroup: home
---

# Lift: Home — Safe

Examine each widget in `lib/screens/home_safe/widgets/` that was marked `shared: true` in `.stitch/designs/home-safe/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/home_safe/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
