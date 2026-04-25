---
id: 003-05-split
title: "Split: Home — Weak Signal"
description: Extract widgets from Home — Weak Signal screen into local widgets/
dependencies:
  - 003-04-analyze
tags:
  - split
  - screen-home-weak
inputs:
  - .stitch/designs/home-weak/widgets.jsonl
outputs:
  - "lib/screens/home_weak/widgets/**/*.dart"
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

# Split: Home — Weak Signal

Extract each widget identified in `.stitch/designs/home-weak/widgets.jsonl` into its own file under `lib/screens/home_weak/widgets/`.

For each widget:
1. Create `lib/screens/home_weak/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
