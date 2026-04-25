---
id: 007-05-split
title: "Split: Co-guardians"
description: Extract widgets from Co-guardians screen into local widgets/
dependencies:
  - 007-04-analyze
tags:
  - split
  - screen-co-guardians-list
inputs:
  - .stitch/designs/co-guardians-list/widgets.jsonl
outputs:
  - "lib/screens/co_guardians_list/widgets/**/*.dart"
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

# Split: Co-guardians

Extract each widget identified in `.stitch/designs/co-guardians-list/widgets.jsonl` into its own file under `lib/screens/co_guardians_list/widgets/`.

For each widget:
1. Create `lib/screens/co_guardians_list/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
