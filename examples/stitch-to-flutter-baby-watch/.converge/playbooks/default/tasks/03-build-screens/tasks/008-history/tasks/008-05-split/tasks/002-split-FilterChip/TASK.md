---
id: 002-split-FilterChip
title: "Split: FilterChip"
description: Extract FilterChip widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/history/history_screen.dart
outputs:
  - lib/screens/history/widgets/filter_chip.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/history/widgets/filter_chip.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/history/widgets/filter_chip.dart
vars:
  name: FilterChip
  grep: class _FilterChip extends StatelessWidget
  description: Filter chip button for time period selection
  shared: true
  widgetName: FilterChip
  grepString: class _FilterChip extends StatelessWidget
  widgetPath: lib/screens/history/widgets/filter_chip.dart
  localWidgetsDir: lib/screens/history/widgets
  screenPath: lib/screens/history/history_screen.dart
  screenId: history
  screenTitle: null
  subtaskId: 002-split-FilterChip
---

# Split: FilterChip

Extract the `FilterChip` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/history/history_screen.dart` using grep string: `class _FilterChip extends StatelessWidget`
2. **Create file** — Write `lib/screens/history/widgets/filter_chip.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `FilterChip()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class FilterChip extends StatelessWidget {
  const FilterChip({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
