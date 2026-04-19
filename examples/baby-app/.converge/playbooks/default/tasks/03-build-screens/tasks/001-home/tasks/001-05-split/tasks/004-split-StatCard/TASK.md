---
id: 004-split-StatCard
title: "Split: StatCard"
description: Extract StatCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/_widgets/stat_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/_widgets/stat_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/home/_widgets/stat_card.dart
vars:
  name: StatCard
  grep: class _StatCard
  description: "Tappable stat card with icon, large numeric value with unit, and label — used in 2-column grid"
  shared: true
  widgetName: StatCard
  grepString: class _StatCard
  widgetPath: lib/screens/home/_widgets/stat_card.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 004-split-StatCard
---

# Split: StatCard

Extract the `StatCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `class _StatCard`
2. **Create file** — Write `lib/screens/home/_widgets/stat_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `StatCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class StatCard extends StatelessWidget {
  const StatCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
