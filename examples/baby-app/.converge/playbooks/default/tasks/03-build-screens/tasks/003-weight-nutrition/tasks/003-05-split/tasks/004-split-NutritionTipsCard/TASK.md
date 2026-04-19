---
id: 004-split-NutritionTipsCard
title: "Split: NutritionTipsCard"
description: Extract NutritionTipsCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/weight_nutrition/weight_nutrition_screen.dart
outputs:
  - lib/screens/weight_nutrition/widgets/nutrition_tips_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/weight_nutrition/widgets/nutrition_tips_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/weight_nutrition/widgets/nutrition_tips_card.dart
vars:
  name: NutritionTipsCard
  grep: Nutrition Tips
  description: "Card listing nutrition tips for the current pregnancy week, each with an icon and descriptive text"
  shared: false
  widgetName: NutritionTipsCard
  grepString: Nutrition Tips
  widgetPath: lib/screens/weight_nutrition/widgets/nutrition_tips_card.dart
  localWidgetsDir: lib/screens/weight_nutrition/widgets
  screenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  screenId: weight-nutrition
  screenTitle: null
  subtaskId: 004-split-NutritionTipsCard
---

# Split: NutritionTipsCard

Extract the `NutritionTipsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `Nutrition Tips`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/nutrition_tips_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `NutritionTipsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class NutritionTipsCard extends StatelessWidget {
  const NutritionTipsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
