---
id: 002-split-ModeSelectorPill
title: "Split: ModeSelectorPill"
description: Extract ModeSelectorPill widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/_widgets/mode_selector_pill.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/_widgets/mode_selector_pill.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/home/_widgets/mode_selector_pill.dart
vars:
  name: ModeSelectorPill
  grep: _buildModeSelectorPill
  description: "Centered pill button showing current mode with chevron-down, opens bottom sheet on tap"
  shared: true
  widgetName: ModeSelectorPill
  grepString: _buildModeSelectorPill
  widgetPath: lib/screens/home/_widgets/mode_selector_pill.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 002-split-ModeSelectorPill
---

# Split: ModeSelectorPill

Extract the `ModeSelectorPill` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `_buildModeSelectorPill`
2. **Create file** — Write `lib/screens/home/_widgets/mode_selector_pill.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ModeSelectorPill()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ModeSelectorPill extends StatelessWidget {
  const ModeSelectorPill({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
