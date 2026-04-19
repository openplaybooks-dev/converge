---
id: 003-split-BottomNavBar
title: "Split: BottomNavBar"
description: Extract BottomNavBar widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/health_log/health_log_screen.dart
outputs:
  - lib/screens/health_log/widgets/bottom_nav_bar.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/health_log/widgets/bottom_nav_bar.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/health_log/widgets/bottom_nav_bar.dart
vars:
  name: BottomNavBar
  grep: NavigationBar(
  description: "Bottom navigation bar with Home, Progress, Health, Wellness, and Learn destinations"
  shared: true
  widgetName: BottomNavBar
  grepString: NavigationBar(
  widgetPath: lib/screens/health_log/widgets/bottom_nav_bar.dart
  localWidgetsDir: lib/screens/health_log/widgets
  screenPath: lib/screens/health_log/health_log_screen.dart
  screenId: health-log
  screenTitle: null
  subtaskId: 003-split-BottomNavBar
---

# Split: BottomNavBar

Extract the `BottomNavBar` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/health_log/health_log_screen.dart` using grep string: `NavigationBar(`
2. **Create file** — Write `lib/screens/health_log/widgets/bottom_nav_bar.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BottomNavBar()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BottomNavBar extends StatelessWidget {
  const BottomNavBar({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
