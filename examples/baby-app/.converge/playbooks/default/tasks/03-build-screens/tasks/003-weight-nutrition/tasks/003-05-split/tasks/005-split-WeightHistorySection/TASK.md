---
id: 005-split-WeightHistorySection
title: "Split: WeightHistorySection"
description: Extract WeightHistorySection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/weight_nutrition/weight_nutrition_screen.dart
outputs:
  - lib/screens/weight_nutrition/widgets/weight_history_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/weight_nutrition/widgets/weight_history_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/weight_nutrition/widgets/weight_history_section.dart
vars:
  name: WeightHistorySection
  grep: Recent Entries
  description: Section with a title and a card containing a list of dated weight history entries with chevron navigation
  shared: false
  widgetName: WeightHistorySection
  grepString: Recent Entries
  widgetPath: lib/screens/weight_nutrition/widgets/weight_history_section.dart
  localWidgetsDir: lib/screens/weight_nutrition/widgets
  screenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  screenId: weight-nutrition
  screenTitle: null
  subtaskId: 005-split-WeightHistorySection
---

# Split: WeightHistorySection

Extract the `WeightHistorySection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `Recent Entries`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/weight_history_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `WeightHistorySection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class WeightHistorySection extends StatelessWidget {
  const WeightHistorySection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
