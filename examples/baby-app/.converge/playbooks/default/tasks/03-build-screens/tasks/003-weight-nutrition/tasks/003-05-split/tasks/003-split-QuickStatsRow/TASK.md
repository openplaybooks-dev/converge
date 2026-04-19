---
id: 003-split-QuickStatsRow
title: "Split: QuickStatsRow"
description: Extract QuickStatsRow widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/weight_nutrition/weight_nutrition_screen.dart
outputs:
  - lib/screens/weight_nutrition/widgets/quick_stats_row.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/weight_nutrition/widgets/quick_stats_row.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/weight_nutrition/widgets/quick_stats_row.dart
vars:
  name: QuickStatsRow
  grep: Weight quick stats
  description: "Horizontal row of three stat cards showing current weight, weekly change, and target range"
  shared: false
  widgetName: QuickStatsRow
  grepString: Weight quick stats
  widgetPath: lib/screens/weight_nutrition/widgets/quick_stats_row.dart
  localWidgetsDir: lib/screens/weight_nutrition/widgets
  screenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  screenId: weight-nutrition
  screenTitle: null
  subtaskId: 003-split-QuickStatsRow
---

# Split: QuickStatsRow

Extract the `QuickStatsRow` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `Weight quick stats`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/quick_stats_row.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `QuickStatsRow()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class QuickStatsRow extends StatelessWidget {
  const QuickStatsRow({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
