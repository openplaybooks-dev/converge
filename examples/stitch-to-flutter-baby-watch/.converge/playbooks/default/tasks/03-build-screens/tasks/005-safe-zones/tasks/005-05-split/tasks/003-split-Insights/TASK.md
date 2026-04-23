---
id: 003-split-Insights
title: "Split: Insights"
description: Extract Insights widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/safe_zones/safe_zones_screen.dart
outputs:
  - lib/screens/safe_zones/widgets/insights.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/safe_zones/widgets/insights.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/safe_zones/widgets/insights.dart
vars:
  name: Insights
  grep: _buildInsights(ColorScheme colorScheme
  description: Row of two insight containers showing weekly alerts count and security percentage
  shared: false
  widgetName: Insights
  grepString: _buildInsights(ColorScheme colorScheme
  widgetPath: lib/screens/safe_zones/widgets/insights.dart
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  screenId: safe-zones
  screenTitle: null
  subtaskId: 003-split-Insights
---

# Split: Insights

Extract the `Insights` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/safe_zones/safe_zones_screen.dart` using grep string: `_buildInsights(ColorScheme colorScheme`
2. **Create file** — Write `lib/screens/safe_zones/widgets/insights.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `Insights()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class Insights extends StatelessWidget {
  const Insights({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
