---
id: 010-05-split
title: "Split: Co-Guardians"
description: Extract widgets from Co-Guardians screen into local widgets/
dependencies:
  - 010-04-analyze
tags:
  - split
  - screen-guardians
inputs:
  - .stitch/designs/guardians/widgets.jsonl
outputs:
  - "lib/screens/guardians/widgets/**/*.dart"
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

# Split: Co-Guardians

Extract each widget identified in `.stitch/designs/guardians/widgets.jsonl` into its own file under `lib/screens/guardians/widgets/`.

For each widget:
1. Create `lib/screens/guardians/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
