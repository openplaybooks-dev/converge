# Task: 03-build-screens/006-add-safe-zone/006-05-split/005-split-ActiveToggle

# Split: ActiveToggle

Extract the `ActiveToggle` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/add_safe_zone/add_safe_zone_screen.dart` using grep string: `Icons.verified_user`
2. **Create file** — Write `lib/screens/add_safe_zone/widgets/active_toggle.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ActiveToggle()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ActiveToggle extends StatelessWidget {
  const ActiveToggle({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```