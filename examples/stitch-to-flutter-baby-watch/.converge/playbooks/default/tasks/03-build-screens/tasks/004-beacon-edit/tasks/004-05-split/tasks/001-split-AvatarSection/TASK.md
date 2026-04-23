---
id: 001-split-AvatarSection
title: "Split: AvatarSection"
description: Extract AvatarSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_edit/beacon_edit_screen.dart
outputs:
  - lib/screens/beacon_edit/widgets/avatar_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_edit/widgets/avatar_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/beacon_edit/widgets/avatar_section.dart
vars:
  name: AvatarSection
  grep: "Container(\\n              width: 96,\\n              height: 96,\\n              decoration: BoxDecoration("
  description: Beacon avatar circle with icon and change button
  shared: false
  widgetName: AvatarSection
  grepString: "Container(\\n              width: 96,\\n              height: 96,\\n              decoration: BoxDecoration("
  widgetPath: lib/screens/beacon_edit/widgets/avatar_section.dart
  localWidgetsDir: lib/screens/beacon_edit/widgets
  screenPath: lib/screens/beacon_edit/beacon_edit_screen.dart
  screenId: beacon-edit
  screenTitle: null
  subtaskId: 001-split-AvatarSection
---

# Split: AvatarSection

Extract the `AvatarSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_edit/beacon_edit_screen.dart` using grep string: `Container(\n              width: 96,\n              height: 96,\n              decoration: BoxDecoration(`
2. **Create file** — Write `lib/screens/beacon_edit/widgets/avatar_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `AvatarSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class AvatarSection extends StatelessWidget {
  const AvatarSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
