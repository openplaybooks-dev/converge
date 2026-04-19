---
id: 005-split-BottomNavBar
title: "Split: BottomNavBar"
description: Extract BottomNavBar widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/education/education_screen.dart
outputs:
  - lib/screens/education/widgets/bottom_nav_bar.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/education/widgets/bottom_nav_bar.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/education/widgets/bottom_nav_bar.dart
vars:
  name: BottomNavBar
  grep: _buildBottomNav
  description: "Five-tab bottom navigation bar with Home, Progress, Health, Wellness, and Learn destinations"
  shared: true
  widgetName: BottomNavBar
  grepString: _buildBottomNav
  widgetPath: lib/screens/education/widgets/bottom_nav_bar.dart
  localWidgetsDir: lib/screens/education/widgets
  screenPath: lib/screens/education/education_screen.dart
  screenId: education
  screenTitle: null
  subtaskId: 005-split-BottomNavBar
---

# Split: BottomNavBar

Extract the `BottomNavBar` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/education/education_screen.dart` using grep string: `_buildBottomNav`
2. **Create file** — Write `lib/screens/education/widgets/bottom_nav_bar.dart` with the extracted widget class
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
