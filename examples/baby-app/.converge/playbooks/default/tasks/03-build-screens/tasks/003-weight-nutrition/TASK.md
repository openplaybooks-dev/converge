---
id: 003-weight-nutrition
title: "Screen: Weight & Nutrition"
dependencies:
  - 002-06-lift
tags:
  - screen
  - screen-weight-nutrition
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/weight_nutrition/weight_nutrition_screen.dart
vars:
  screenId: weight-nutrition
  screenTitle: "Weight & Nutrition"
  widgetName: WeightNutrition
  route: /weight
---

Parent task for building the "Weight & Nutrition" screen through the full pipeline: spec → design → convert → analyze → split → lift.
