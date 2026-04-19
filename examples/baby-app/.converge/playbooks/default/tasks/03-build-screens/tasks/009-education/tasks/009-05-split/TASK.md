---
id: 009-05-split
title: "Split: Education"
description: Extract widgets from Education screen into local widgets/
dependencies:
  - 009-04-analyze
tags:
  - split
  - screen-education
inputs:
  - .stitch/designs/education/widgets.jsonl
outputs:
  - "lib/screens/education/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 009
  screenId: education
  title: Education
  widgetName: Education
  snakeName: education
  route: /education
  screenPath: lib/screens/education/education_screen.dart
  widgetsJsonPath: .stitch/designs/education/widgets.jsonl
  localWidgetsDir: lib/screens/education/widgets
  screenTaskId: 009-education
  specPath: .stitch/designs/education/SPEC.md
  metaPath: .stitch/designs/education/META.md
  designPath: .stitch/designs/education/design.html
  prevScreenLastId: 008-06-lift
---

# Split: Education

Extract each widget identified in `.stitch/designs/education/widgets.jsonl` into its own file under `lib/screens/education/widgets/`.

For each widget:
1. Create `lib/screens/education/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
