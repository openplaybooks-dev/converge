---
id: 004-split-BottomNav
title: "Split: BottomNav"
description: Extract BottomNav widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/safe_zones/safe_zones_screen.dart
outputs:
  - lib/screens/safe_zones/widgets/bottom_nav.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/safe_zones/widgets/bottom_nav.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/safe_zones/widgets/bottom_nav.dart
vars:
  name: BottomNav
  grep: _buildBottomNav(BuildContext context)
  description: "Bottom navigation bar with nav items for home, devices, safety, and settings"
  shared: true
  widgetName: BottomNav
  grepString: _buildBottomNav(BuildContext context)
  widgetPath: lib/screens/safe_zones/widgets/bottom_nav.dart
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  screenId: safe-zones
  screenTitle: null
  subtaskId: 004-split-BottomNav
---

# Split: BottomNav

Extract the `BottomNav` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/safe_zones/safe_zones_screen.dart` using grep string: `_buildBottomNav(BuildContext context)`
2. **Create file** — Write `lib/screens/safe_zones/widgets/bottom_nav.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BottomNav()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BottomNav extends StatelessWidget {
  const BottomNav({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
