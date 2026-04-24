---
id: 002-split-InviteGuardianButton
title: "Split: InviteGuardianButton"
description: Extract InviteGuardianButton widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/guardians/guardians_screen.dart
outputs:
  - lib/screens/guardians/widgets/invite_guardian_button.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/guardians/widgets/invite_guardian_button.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/guardians/widgets/invite_guardian_button.dart
vars:
  name: InviteGuardianButton
  grep: Mời người cùng theo dõi
  description: Elevated button with icon to invite a new guardian
  shared: false
  widgetName: InviteGuardianButton
  grepString: Mời người cùng theo dõi
  widgetPath: lib/screens/guardians/widgets/invite_guardian_button.dart
  localWidgetsDir: lib/screens/guardians/widgets
  screenPath: lib/screens/guardians/guardians_screen.dart
  screenId: guardians
  screenTitle: null
  subtaskId: 002-split-InviteGuardianButton
---

# Split: InviteGuardianButton

Extract the `InviteGuardianButton` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/guardians/guardians_screen.dart` using grep string: `Mời người cùng theo dõi`
2. **Create file** — Write `lib/screens/guardians/widgets/invite_guardian_button.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `InviteGuardianButton()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class InviteGuardianButton extends StatelessWidget {
  const InviteGuardianButton({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
