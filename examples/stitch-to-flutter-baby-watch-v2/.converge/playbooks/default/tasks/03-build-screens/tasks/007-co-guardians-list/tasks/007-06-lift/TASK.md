---
id: 007-06-lift
title: "Lift: Co-guardians"
description: Lift shared widgets from Co-guardians to lib/widgets/
dependencies:
  - 007-05-split
blocking: true
tags:
  - lift
  - screen-co-guardians-list
inputs:
  - .stitch/designs/co-guardians-list/widgets.jsonl
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 007
  screenId: co-guardians-list
  title: Co-guardians
  widgetName: CoGuardiansList
  snakeName: co_guardians_list
  route: /devices/co-guardians
  screenPath: lib/screens/co_guardians_list/co_guardians_list_screen.dart
  widgetsJsonPath: .stitch/designs/co-guardians-list/widgets.jsonl
  localWidgetsDir: lib/screens/co_guardians_list/widgets
  screenTaskId: 007-co-guardians-list
  specPath: .stitch/designs/co-guardians-list/SPEC.md
  metaPath: .stitch/designs/co-guardians-list/META.md
  designPath: .stitch/designs/co-guardians-list/design.html
  linkedHtmlPath: .stitch/designs/co-guardians-list/code.html
  statesPath: lib/screens/co_guardians_list/co_guardians_list_states.dart
  htmlReference: .stitch/references/ch_p_nh_n_l_i_m_i/code.html
  htmlReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/code.html\"\n"
  screenshotReference: .stitch/references/ch_p_nh_n_l_i_m_i/screen.png
  screenshotReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/screen.png\"\n"
  prevScreenLastId: 006-07-states
  variant: 
  variantGroup: 
---

# Lift: Co-guardians

Examine each widget in `lib/screens/co_guardians_list/widgets/` that was marked `shared: true` in `.stitch/designs/co-guardians-list/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/co_guardians_list/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
