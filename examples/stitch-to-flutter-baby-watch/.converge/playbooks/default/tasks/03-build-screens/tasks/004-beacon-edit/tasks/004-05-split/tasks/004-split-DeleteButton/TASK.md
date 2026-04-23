---
id: 004-split-DeleteButton
title: "Split: DeleteButton"
description: Extract DeleteButton widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_edit/beacon_edit_screen.dart
outputs:
  - lib/screens/beacon_edit/widgets/delete_button.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_edit/widgets/delete_button.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/beacon_edit/widgets/delete_button.dart
vars:
  name: DeleteButton
  grep: "SizedBox(\\n              width: double.infinity,\\n              child: TextButton(\\n                onPressed: () {},\\n                style: TextButton.styleFrom(\\n                  foregroundColor: colorScheme.error"
  description: Delete beacon button with icon
  shared: false
  widgetName: DeleteButton
  grepString: "SizedBox(\\n              width: double.infinity,\\n              child: TextButton(\\n                onPressed: () {},\\n                style: TextButton.styleFrom(\\n                  foregroundColor: colorScheme.error"
  widgetPath: lib/screens/beacon_edit/widgets/delete_button.dart
  localWidgetsDir: lib/screens/beacon_edit/widgets
  screenPath: lib/screens/beacon_edit/beacon_edit_screen.dart
  screenId: beacon-edit
  screenTitle: null
  subtaskId: 004-split-DeleteButton
---

# Split: DeleteButton

Extract the `DeleteButton` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_edit/beacon_edit_screen.dart` using grep string: `SizedBox(\n              width: double.infinity,\n              child: TextButton(\n                onPressed: () {},\n                style: TextButton.styleFrom(\n                  foregroundColor: colorScheme.error`
2. **Create file** — Write `lib/screens/beacon_edit/widgets/delete_button.dart` with the extracted widget class
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
