# Task: 03-build-screens/011-onboarding/011-05-split/001-split-PermissionCard

# Split: PermissionCard

Extract the `PermissionCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/onboarding/onboarding_screen.dart` using grep string: `iconBgColor: colorScheme.secondaryContainer`
2. **Create file** — Write `lib/screens/onboarding/widgets/permission_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PermissionCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PermissionCard extends StatelessWidget {
  const PermissionCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```