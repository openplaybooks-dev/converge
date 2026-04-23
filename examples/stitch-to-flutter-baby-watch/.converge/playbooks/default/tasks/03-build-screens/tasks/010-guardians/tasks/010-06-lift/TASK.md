---
id: 010-06-lift
title: "Lift: Co-Guardians"
description: Lift shared widgets from Co-Guardians to lib/widgets/
dependencies:
  - 010-05-split
blocking: true
tags:
  - lift
  - screen-guardians
inputs:
  - .stitch/designs/guardians/widgets.jsonl
  - "lib/screens/guardians/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 010
  screenId: guardians
  title: Co-Guardians
  widgetName: Guardians
  snakeName: guardians
  route: /guardians
  screenPath: lib/screens/guardians/guardians_screen.dart
  widgetsJsonPath: .stitch/designs/guardians/widgets.jsonl
  localWidgetsDir: lib/screens/guardians/widgets
  screenTaskId: 010-guardians
  specPath: .stitch/designs/guardians/SPEC.md
  metaPath: .stitch/designs/guardians/META.md
  designPath: .stitch/designs/guardians/design.html
  prevScreenLastId: 009-06-lift
  htmlReference: .stitch/references/ch_p_nh_n_l_i_m_i/code.html
  htmlReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/code.html\"\n"
---

# Lift: Co-Guardians

Examine each widget in `lib/screens/guardians/widgets/` that was marked `shared: true` in `.stitch/designs/guardians/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/guardians/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
