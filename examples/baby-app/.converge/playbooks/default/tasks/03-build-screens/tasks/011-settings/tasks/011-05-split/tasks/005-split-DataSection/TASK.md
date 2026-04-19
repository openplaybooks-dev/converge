---
id: 005-split-DataSection
title: "Split: DataSection"
description: Extract DataSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/data_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/data_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/settings/widgets/data_section.dart
vars:
  name: DataSection
  grep: _buildDataSection
  description: Card with export data and clear all data action rows
  shared: false
  widgetName: DataSection
  grepString: _buildDataSection
  widgetPath: lib/screens/settings/widgets/data_section.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 005-split-DataSection
---

# Split: DataSection

Extract the `DataSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildDataSection`
2. **Create file** — Write `lib/screens/settings/widgets/data_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `DataSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class DataSection extends StatelessWidget {
  const DataSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
