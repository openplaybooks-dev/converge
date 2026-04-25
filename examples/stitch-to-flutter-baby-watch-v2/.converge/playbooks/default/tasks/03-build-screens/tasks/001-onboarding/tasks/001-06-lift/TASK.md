---
id: 001-06-lift
title: "Lift: Onboarding"
description: Lift shared widgets from Onboarding to lib/widgets/
dependencies:
  - 001-05-split
blocking: true
tags:
  - lift
  - screen-onboarding
inputs:
  - .stitch/designs/onboarding/widgets.jsonl
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 001
  screenId: onboarding
  title: Onboarding
  widgetName: Onboarding
  snakeName: onboarding
  route: /onboarding
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  widgetsJsonPath: .stitch/designs/onboarding/widgets.jsonl
  localWidgetsDir: lib/screens/onboarding/widgets
  screenTaskId: 001-onboarding
  specPath: .stitch/designs/onboarding/SPEC.md
  metaPath: .stitch/designs/onboarding/META.md
  designPath: .stitch/designs/onboarding/design.html
  linkedHtmlPath: .stitch/designs/onboarding/code.html
  statesPath: lib/screens/onboarding/onboarding_states.dart
  htmlReference: .stitch/references/babyguard_onboarding_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_onboarding_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_onboarding_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_onboarding_phase_2/screen.png\"\n"
  prevScreenLastId: 
  variant: 
  variantGroup: 
---

# Lift: Onboarding

Examine each widget in `lib/screens/onboarding/widgets/` that was marked `shared: true` in `.stitch/designs/onboarding/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/onboarding/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
