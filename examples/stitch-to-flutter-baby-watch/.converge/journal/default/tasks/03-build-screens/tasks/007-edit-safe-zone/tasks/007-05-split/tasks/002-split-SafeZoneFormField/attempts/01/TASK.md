# Task: 03-build-screens/007-edit-safe-zone/007-05-split/002-split-SafeZoneFormField

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