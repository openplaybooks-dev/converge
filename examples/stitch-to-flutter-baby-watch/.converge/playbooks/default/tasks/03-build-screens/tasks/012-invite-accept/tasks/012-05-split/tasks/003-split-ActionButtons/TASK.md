---
id: 003-split-ActionButtons
title: "Split: ActionButtons"
description: Extract ActionButtons widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/invite_accept/invite_accept_screen.dart
outputs:
  - lib/screens/invite_accept/widgets/action_buttons.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/invite_accept/widgets/action_buttons.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/invite_accept/widgets/action_buttons.dart
vars:
  name: ActionButtons
  grep: // Action Buttons
  description: Accept and Reject buttons
  shared: false
  widgetName: ActionButtons
  grepString: // Action Buttons
  widgetPath: lib/screens/invite_accept/widgets/action_buttons.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  screenId: invite-accept
  screenTitle: null
  subtaskId: 003-split-ActionButtons
---

# Split: ActionButtons

Extract the `ActionButtons` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `// Action Buttons`
2. **Create file** — Write `lib/screens/invite_accept/widgets/action_buttons.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ActionButtons()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ActionButtons extends StatelessWidget {
  const ActionButtons({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
