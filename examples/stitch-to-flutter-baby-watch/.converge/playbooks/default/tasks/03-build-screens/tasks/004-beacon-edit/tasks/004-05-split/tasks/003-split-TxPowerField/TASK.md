---
id: 003-split-TxPowerField
title: "Split: TxPowerField"
description: Extract TxPowerField widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_edit/beacon_edit_screen.dart
outputs:
  - lib/screens/beacon_edit/widgets/tx_power_field.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_edit/widgets/tx_power_field.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/beacon_edit/widgets/tx_power_field.dart
vars:
  name: TxPowerField
  grep: "TextField(\\n                controller: _txPowerController"
  description: TX Power input field with helper text
  shared: true
  widgetName: TxPowerField
  grepString: "TextField(\\n                controller: _txPowerController"
  widgetPath: lib/screens/beacon_edit/widgets/tx_power_field.dart
  localWidgetsDir: lib/screens/beacon_edit/widgets
  screenPath: lib/screens/beacon_edit/beacon_edit_screen.dart
  screenId: beacon-edit
  screenTitle: null
  subtaskId: 003-split-TxPowerField
---

# Split: TxPowerField

Extract the `TxPowerField` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_edit/beacon_edit_screen.dart` using grep string: `TextField(\n                controller: _txPowerController`
2. **Create file** — Write `lib/screens/beacon_edit/widgets/tx_power_field.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `TxPowerField()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class TxPowerField extends StatelessWidget {
  const TxPowerField({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
