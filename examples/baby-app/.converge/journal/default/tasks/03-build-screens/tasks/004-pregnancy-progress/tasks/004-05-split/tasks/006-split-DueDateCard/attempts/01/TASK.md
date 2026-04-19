# Task: 03-build-screens/004-pregnancy-progress/004-05-split/006-split-DueDateCard

# Split: DueDateCard

Extract the `DueDateCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildDueDateCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/due_date_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `DueDateCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class DueDateCard extends StatelessWidget {
  const DueDateCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```