---
id: 005-split-PaginationDots
title: "Split: PaginationDots"
description: Extract PaginationDots widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/_widgets/pagination_dots.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/_widgets/pagination_dots.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/home/_widgets/pagination_dots.dart
vars:
  name: PaginationDots
  grep: class _PaginationDot
  description: Row of animated pagination dots indicating swipeable content position
  shared: true
  widgetName: PaginationDots
  grepString: class _PaginationDot
  widgetPath: lib/screens/home/_widgets/pagination_dots.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 005-split-PaginationDots
---

# Split: PaginationDots

Extract the `PaginationDots` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `class _PaginationDot`
2. **Create file** — Write `lib/screens/home/_widgets/pagination_dots.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PaginationDots()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PaginationDots extends StatelessWidget {
  const PaginationDots({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
