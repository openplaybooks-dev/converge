---
id: 002-split-BmiGaugeCard
title: "Split: BmiGaugeCard"
description: Extract BmiGaugeCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/weight_nutrition/weight_nutrition_screen.dart
outputs:
  - lib/screens/weight_nutrition/widgets/bmi_gauge_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/weight_nutrition/widgets/bmi_gauge_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/weight_nutrition/widgets/bmi_gauge_card.dart
vars:
  name: BmiGaugeCard
  grep: BMI gauge showing 22.4
  description: "Card displaying BMI value with a segmented color gauge, needle indicator, threshold labels, height row, and health category label"
  shared: false
  widgetName: BmiGaugeCard
  grepString: BMI gauge showing 22.4
  widgetPath: lib/screens/weight_nutrition/widgets/bmi_gauge_card.dart
  localWidgetsDir: lib/screens/weight_nutrition/widgets
  screenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  screenId: weight-nutrition
  screenTitle: null
  subtaskId: 002-split-BmiGaugeCard
---

# Split: BmiGaugeCard

Extract the `BmiGaugeCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `BMI gauge showing 22.4`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/bmi_gauge_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BmiGaugeCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BmiGaugeCard extends StatelessWidget {
  const BmiGaugeCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
