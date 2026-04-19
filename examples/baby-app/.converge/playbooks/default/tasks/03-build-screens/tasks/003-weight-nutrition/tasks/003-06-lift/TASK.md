---
id: 003-06-lift
title: "Lift: Weight & Nutrition"
description: "Lift shared widgets from Weight & Nutrition to lib/widgets/"
dependencies:
  - 003-05-split
blocking: true
tags:
  - lift
  - screen-weight-nutrition
inputs:
  - .stitch/designs/weight-nutrition/widgets.jsonl
  - "lib/screens/weight_nutrition/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
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

# Lift: Weight & Nutrition

Examine each widget in `lib/screens/weight_nutrition/widgets/` that was marked `shared: true` in `.stitch/designs/weight-nutrition/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/weight_nutrition/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
