---
id: 004-split-QuickActions
title: "Split: QuickActions"
description: Extract QuickActions widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/widgets/quick_actions.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/widgets/quick_actions.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/home/widgets/quick_actions.dart
vars:
  name: QuickActions
  grep: _buildQuickActions()
  description: Mute notification quick actions with preset time buttons
  shared: false
  widgetName: QuickActions
  grepString: _buildQuickActions()
  widgetPath: lib/screens/home/widgets/quick_actions.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 004-split-QuickActions
---

# Split: QuickActions

Extract the `QuickActions` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `_buildQuickActions()`
2. **Create file** — Write `lib/screens/home/widgets/quick_actions.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `QuickActions()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class QuickActions extends StatelessWidget {
  const QuickActions({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
