# Task: 03-build-screens/004-pregnancy-progress/004-05-split/004-split-SelfCareCard

# Split: SelfCareCard

Extract the `SelfCareCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildSelfCareCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/self_care_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `SelfCareCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class SelfCareCard extends StatelessWidget {
  const SelfCareCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```