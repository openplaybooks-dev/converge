---
id: 002-split-SafeZoneFormField
title: "Split: SafeZoneFormField"
description: Extract SafeZoneFormField widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
outputs:
  - lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart
vars:
  name: SafeZoneFormField
  grep: SafeZoneFormField
  description: Text form field for safe zone name input
  shared: true
  widgetName: SafeZoneFormField
  grepString: SafeZoneFormField
  widgetPath: lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  screenId: edit-safe-zone
  screenTitle: null
  subtaskId: 002-split-SafeZoneFormField
---

# Split: SafeZoneFormField

Extract the `SafeZoneFormField` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/edit_safe_zone/edit_safe_zone_screen.dart` using grep string: `SafeZoneFormField`
2. **Create file** — Write `lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `SafeZoneFormField()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class SafeZoneFormField extends StatelessWidget {
  const SafeZoneFormField({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
