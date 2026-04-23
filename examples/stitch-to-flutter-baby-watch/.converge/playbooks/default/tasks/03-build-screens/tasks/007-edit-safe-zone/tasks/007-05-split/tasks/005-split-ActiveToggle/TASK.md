---
id: 005-split-ActiveToggle
title: "Split: ActiveToggle"
description: Extract ActiveToggle widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
outputs:
  - lib/screens/edit_safe_zone/widgets/active_toggle.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/edit_safe_zone/widgets/active_toggle.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/edit_safe_zone/widgets/active_toggle.dart
vars:
  name: ActiveToggle
  grep: ActiveToggle
  description: Toggle switch for activating/deactivating safe zone
  shared: true
  widgetName: ActiveToggle
  grepString: ActiveToggle
  widgetPath: lib/screens/edit_safe_zone/widgets/active_toggle.dart
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  screenId: edit-safe-zone
  screenTitle: null
  subtaskId: 005-split-ActiveToggle
---

# Split: ActiveToggle

Extract the `ActiveToggle` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/edit_safe_zone/edit_safe_zone_screen.dart` using grep string: `ActiveToggle`
2. **Create file** — Write `lib/screens/edit_safe_zone/widgets/active_toggle.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ActiveToggle()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ActiveToggle extends StatelessWidget {
  const ActiveToggle({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
