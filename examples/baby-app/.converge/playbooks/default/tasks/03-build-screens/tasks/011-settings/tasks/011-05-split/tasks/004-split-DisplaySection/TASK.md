---
id: 004-split-DisplaySection
title: "Split: DisplaySection"
description: Extract DisplaySection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/display_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/display_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/settings/widgets/display_section.dart
vars:
  name: DisplaySection
  grep: _buildDisplaySection
  description: Card with reduced motion toggle and kg/lbs segmented weight-unit selector
  shared: false
  widgetName: DisplaySection
  grepString: _buildDisplaySection
  widgetPath: lib/screens/settings/widgets/display_section.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 004-split-DisplaySection
---

# Split: DisplaySection

Extract the `DisplaySection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildDisplaySection`
2. **Create file** — Write `lib/screens/settings/widgets/display_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `DisplaySection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class DisplaySection extends StatelessWidget {
  const DisplaySection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
