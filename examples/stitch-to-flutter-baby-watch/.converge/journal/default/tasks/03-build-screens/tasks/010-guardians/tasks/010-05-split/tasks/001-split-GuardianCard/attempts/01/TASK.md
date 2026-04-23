# Task: 03-build-screens/010-guardians/010-05-split/001-split-GuardianCard

# Split: GuardianCard

Extract the `GuardianCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/guardians/guardians_screen.dart` using grep string: `class _GuardianCard extends StatelessWidget`
2. **Create file** — Write `lib/screens/guardians/widgets/guardian_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `GuardianCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class GuardianCard extends StatelessWidget {
  const GuardianCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```