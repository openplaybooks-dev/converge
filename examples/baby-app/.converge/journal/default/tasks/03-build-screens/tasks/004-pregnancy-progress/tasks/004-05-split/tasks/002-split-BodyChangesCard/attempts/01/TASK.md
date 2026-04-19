# Task: 03-build-screens/004-pregnancy-progress/004-05-split/002-split-BodyChangesCard

# Split: BodyChangesCard

Extract the `BodyChangesCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildBodyChangesCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/body_changes_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BodyChangesCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BodyChangesCard extends StatelessWidget {
  const BodyChangesCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```