---
id: 001-split-StatusSection
title: "Split: StatusSection"
description: Extract StatusSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/widgets/status_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/widgets/status_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/home/widgets/status_section.dart
vars:
  name: StatusSection
  grep: _buildStatusSection()
  description: Safe state pill and child name/subtitle header section
  shared: false
  widgetName: StatusSection
  grepString: _buildStatusSection()
  widgetPath: lib/screens/home/widgets/status_section.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 001-split-StatusSection
---

# Split: StatusSection

Extract the `StatusSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `_buildStatusSection()`
2. **Create file** — Write `lib/screens/home/widgets/status_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `StatusSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class StatusSection extends StatelessWidget {
  const StatusSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
