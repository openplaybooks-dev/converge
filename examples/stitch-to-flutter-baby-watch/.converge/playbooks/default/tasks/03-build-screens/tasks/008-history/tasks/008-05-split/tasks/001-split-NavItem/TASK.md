---
id: 001-split-NavItem
title: "Split: NavItem"
description: Extract NavItem widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/history/history_screen.dart
outputs:
  - lib/screens/history/widgets/nav_item.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/history/widgets/nav_item.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/history/widgets/nav_item.dart
vars:
  name: NavItem
  grep: class _NavItem extends StatelessWidget
  description: Bottom navigation item with icon and label
  shared: true
  widgetName: NavItem
  grepString: class _NavItem extends StatelessWidget
  widgetPath: lib/screens/history/widgets/nav_item.dart
  localWidgetsDir: lib/screens/history/widgets
  screenPath: lib/screens/history/history_screen.dart
  screenId: history
  screenTitle: null
  subtaskId: 001-split-NavItem
---

# Split: NavItem

Extract the `NavItem` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/history/history_screen.dart` using grep string: `class _NavItem extends StatelessWidget`
2. **Create file** — Write `lib/screens/history/widgets/nav_item.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `NavItem()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class NavItem extends StatelessWidget {
  const NavItem({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
