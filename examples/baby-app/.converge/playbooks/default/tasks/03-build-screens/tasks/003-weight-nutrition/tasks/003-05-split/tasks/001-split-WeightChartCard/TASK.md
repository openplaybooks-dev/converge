---
id: 001-split-WeightChartCard
title: "Split: WeightChartCard"
description: Extract WeightChartCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/weight_nutrition/weight_nutrition_screen.dart
outputs:
  - lib/screens/weight_nutrition/widgets/weight_chart_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/weight_nutrition/widgets/weight_chart_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/weight_nutrition/widgets/weight_chart_card.dart
vars:
  name: WeightChartCard
  grep: Weight Trend
  description: "Card with a custom-painted line chart showing weight trend over weeks, with gradient fill and data point markers"
  shared: false
  widgetName: WeightChartCard
  grepString: Weight Trend
  widgetPath: lib/screens/weight_nutrition/widgets/weight_chart_card.dart
  localWidgetsDir: lib/screens/weight_nutrition/widgets
  screenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  screenId: weight-nutrition
  screenTitle: null
  subtaskId: 001-split-WeightChartCard
---

# Split: WeightChartCard

Extract the `WeightChartCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `Weight Trend`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/weight_chart_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `WeightChartCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class WeightChartCard extends StatelessWidget {
  const WeightChartCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
