---
id: 006-split-DeleteButton
title: "Split: DeleteButton"
description: Extract DeleteButton widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
outputs:
  - lib/screens/edit_safe_zone/widgets/delete_button.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/edit_safe_zone/widgets/delete_button.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/edit_safe_zone/widgets/delete_button.dart
vars:
  name: DeleteButton
  grep: _DeleteButton
  description: Delete safe zone button with confirmation
  shared: false
  widgetName: DeleteButton
  grepString: _DeleteButton
  widgetPath: lib/screens/edit_safe_zone/widgets/delete_button.dart
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  screenId: edit-safe-zone
  screenTitle: null
  subtaskId: 006-split-DeleteButton
---

# Split: DeleteButton

Extract the `DeleteButton` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/edit_safe_zone/edit_safe_zone_screen.dart` using grep string: `_DeleteButton`
2. **Create file** — Write `lib/screens/edit_safe_zone/widgets/delete_button.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `DeleteButton()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class DeleteButton extends StatelessWidget {
  const DeleteButton({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
