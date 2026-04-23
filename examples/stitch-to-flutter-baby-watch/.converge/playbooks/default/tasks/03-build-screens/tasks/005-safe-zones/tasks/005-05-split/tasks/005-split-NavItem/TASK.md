---
id: 005-split-NavItem
title: "Split: NavItem"
description: Extract NavItem widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/safe_zones/safe_zones_screen.dart
outputs:
  - lib/screens/safe_zones/widgets/nav_item.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/safe_zones/widgets/nav_item.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/safe_zones/widgets/nav_item.dart
vars:
  name: NavItem
  grep: _buildNavItem(BuildContext context
  description: "Single navigation item with icon and label, handles selected/unselected state"
  shared: true
  widgetName: NavItem
  grepString: _buildNavItem(BuildContext context
  widgetPath: lib/screens/safe_zones/widgets/nav_item.dart
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  screenId: safe-zones
  screenTitle: null
  subtaskId: 005-split-NavItem
---

# Split: NavItem

Extract the `NavItem` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/safe_zones/safe_zones_screen.dart` using grep string: `_buildNavItem(BuildContext context`
2. **Create file** — Write `lib/screens/safe_zones/widgets/nav_item.dart` with the extracted widget class
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
