---
id: 009-06-lift
title: "Lift: Education"
description: Lift shared widgets from Education to lib/widgets/
dependencies:
  - 009-05-split
blocking: true
tags:
  - lift
  - screen-education
inputs:
  - .stitch/designs/education/widgets.jsonl
  - "lib/screens/education/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Education

Examine each widget in `lib/screens/education/widgets/` that was marked `shared: true` in `.stitch/designs/education/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/education/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
