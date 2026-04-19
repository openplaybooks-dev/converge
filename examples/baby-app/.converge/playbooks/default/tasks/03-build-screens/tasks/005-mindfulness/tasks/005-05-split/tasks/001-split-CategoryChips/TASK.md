---
id: 001-split-CategoryChips
title: "Split: CategoryChips"
description: Extract CategoryChips widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mindfulness/mindfulness_screen.dart
outputs:
  - lib/screens/mindfulness/widgets/category_chips.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mindfulness/widgets/category_chips.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mindfulness/widgets/category_chips.dart
vars:
  name: CategoryChips
  grep: _buildCategoryChips
  description: "Horizontal scrollable list of category filter chips (All, Breathing, Stretching, Meditation) with selection state"
  shared: false
  widgetName: CategoryChips
  grepString: _buildCategoryChips
  widgetPath: lib/screens/mindfulness/widgets/category_chips.dart
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  screenId: mindfulness
  screenTitle: null
  subtaskId: 001-split-CategoryChips
---

# Split: CategoryChips

Extract the `CategoryChips` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mindfulness/mindfulness_screen.dart` using grep string: `_buildCategoryChips`
2. **Create file** — Write `lib/screens/mindfulness/widgets/category_chips.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `CategoryChips()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class CategoryChips extends StatelessWidget {
  const CategoryChips({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
