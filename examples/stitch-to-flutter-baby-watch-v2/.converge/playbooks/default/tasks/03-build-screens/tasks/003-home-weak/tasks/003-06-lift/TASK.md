---
id: 003-06-lift
title: "Lift: Home — Weak Signal"
description: Lift shared widgets from Home — Weak Signal to lib/widgets/
dependencies:
  - 003-05-split
blocking: true
tags:
  - lift
  - screen-home-weak
inputs:
  - .stitch/designs/home-weak/widgets.jsonl
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 003
  screenId: home-weak
  title: Home — Weak Signal
  widgetName: HomeWeak
  snakeName: home_weak
  route: /home
  screenPath: lib/screens/home_weak/home_weak_screen.dart
  widgetsJsonPath: .stitch/designs/home-weak/widgets.jsonl
  localWidgetsDir: lib/screens/home_weak/widgets
  screenTaskId: 003-home-weak
  specPath: .stitch/designs/home-weak/SPEC.md
  metaPath: .stitch/designs/home-weak/META.md
  designPath: .stitch/designs/home-weak/design.html
  linkedHtmlPath: .stitch/designs/home-weak/code.html
  statesPath: lib/screens/home_weak/home_weak_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_weak_signal/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_weak_signal/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_weak_signal/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_weak_signal/screen.png\"\n"
  prevScreenLastId: 002-07-states
  variant: weak
  variantGroup: home
---

# Lift: Home — Weak Signal

Examine each widget in `lib/screens/home_weak/widgets/` that was marked `shared: true` in `.stitch/designs/home-weak/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/home_weak/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
