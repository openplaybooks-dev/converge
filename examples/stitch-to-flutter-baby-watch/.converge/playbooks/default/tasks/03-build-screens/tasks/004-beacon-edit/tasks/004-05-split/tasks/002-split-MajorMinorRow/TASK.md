---
id: 002-split-MajorMinorRow
title: "Split: MajorMinorRow"
description: Extract MajorMinorRow widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_edit/beacon_edit_screen.dart
outputs:
  - lib/screens/beacon_edit/widgets/major_minor_row.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_edit/widgets/major_minor_row.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/beacon_edit/widgets/major_minor_row.dart
vars:
  name: MajorMinorRow
  grep: "Row(\\n              children: [\\n                Expanded(\\n                  child: Column("
  description: Two-column row for Major and Minor field inputs
  shared: true
  widgetName: MajorMinorRow
  grepString: "Row(\\n              children: [\\n                Expanded(\\n                  child: Column("
  widgetPath: lib/screens/beacon_edit/widgets/major_minor_row.dart
  localWidgetsDir: lib/screens/beacon_edit/widgets
  screenPath: lib/screens/beacon_edit/beacon_edit_screen.dart
  screenId: beacon-edit
  screenTitle: null
  subtaskId: 002-split-MajorMinorRow
---

# Split: MajorMinorRow

Extract the `MajorMinorRow` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_edit/beacon_edit_screen.dart` using grep string: `Row(\n              children: [\n                Expanded(\n                  child: Column(`
2. **Create file** — Write `lib/screens/beacon_edit/widgets/major_minor_row.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MajorMinorRow()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MajorMinorRow extends StatelessWidget {
  const MajorMinorRow({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
