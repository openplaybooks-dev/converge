---
id: 003-05-split
title: "Split: Weight & Nutrition"
description: "Extract widgets from Weight & Nutrition screen into local widgets/"
dependencies:
  - 003-04-analyze
tags:
  - split
  - screen-weight-nutrition
inputs:
  - .stitch/designs/weight-nutrition/widgets.jsonl
outputs:
  - "lib/screens/weight_nutrition/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 003
  screenId: weight-nutrition
  title: "Weight & Nutrition"
  widgetName: WeightNutrition
  snakeName: weight_nutrition
  route: /weight
  screenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  widgetsJsonPath: .stitch/designs/weight-nutrition/widgets.jsonl
  localWidgetsDir: lib/screens/weight_nutrition/widgets
  screenTaskId: 003-weight-nutrition
  specPath: .stitch/designs/weight-nutrition/SPEC.md
  metaPath: .stitch/designs/weight-nutrition/META.md
  designPath: .stitch/designs/weight-nutrition/design.html
  prevScreenLastId: 002-06-lift
---

# Split: Weight & Nutrition

Extract each widget identified in `.stitch/designs/weight-nutrition/widgets.jsonl` into its own file under `lib/screens/weight_nutrition/widgets/`.

For each widget:
1. Create `lib/screens/weight_nutrition/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
