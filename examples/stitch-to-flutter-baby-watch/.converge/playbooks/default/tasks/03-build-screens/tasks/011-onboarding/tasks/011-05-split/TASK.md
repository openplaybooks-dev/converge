---
id: 011-05-split
title: "Split: Onboarding"
description: Extract widgets from Onboarding screen into local widgets/
dependencies:
  - 011-04-analyze
tags:
  - split
  - screen-onboarding
inputs:
  - .stitch/designs/onboarding/widgets.jsonl
outputs:
  - "lib/screens/onboarding/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 011
  screenId: onboarding
  title: Onboarding
  widgetName: Onboarding
  snakeName: onboarding
  route: /onboarding
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  widgetsJsonPath: .stitch/designs/onboarding/widgets.jsonl
  localWidgetsDir: lib/screens/onboarding/widgets
  screenTaskId: 011-onboarding
  specPath: .stitch/designs/onboarding/SPEC.md
  metaPath: .stitch/designs/onboarding/META.md
  designPath: .stitch/designs/onboarding/design.html
  prevScreenLastId: 010-06-lift
  htmlReference: .stitch/references/babyguard_onboarding_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_onboarding_phase_2/code.html\"\n"
---

# Split: Onboarding

Extract each widget identified in `.stitch/designs/onboarding/widgets.jsonl` into its own file under `lib/screens/onboarding/widgets/`.

For each widget:
1. Create `lib/screens/onboarding/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
