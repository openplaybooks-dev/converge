---
id: 003-split-AddressField
title: "Split: AddressField"
description: Extract AddressField widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/add_safe_zone/add_safe_zone_screen.dart
outputs:
  - lib/screens/add_safe_zone/widgets/address_field.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/add_safe_zone/widgets/address_field.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/add_safe_zone/widgets/address_field.dart
vars:
  name: AddressField
  grep: "suffixIcon: IconButton"
  description: Address input with location icon button
  shared: false
  widgetName: AddressField
  grepString: "suffixIcon: IconButton"
  widgetPath: lib/screens/add_safe_zone/widgets/address_field.dart
  localWidgetsDir: lib/screens/add_safe_zone/widgets
  screenPath: lib/screens/add_safe_zone/add_safe_zone_screen.dart
  screenId: add-safe-zone
  screenTitle: null
  subtaskId: 003-split-AddressField
---

# Split: AddressField

Extract the `AddressField` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/add_safe_zone/add_safe_zone_screen.dart` using grep string: `suffixIcon: IconButton`
2. **Create file** — Write `lib/screens/add_safe_zone/widgets/address_field.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `AddressField()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class AddressField extends StatelessWidget {
  const AddressField({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
