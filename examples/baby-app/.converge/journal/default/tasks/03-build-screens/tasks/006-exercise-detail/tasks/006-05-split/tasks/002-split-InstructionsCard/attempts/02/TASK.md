# Task: 03-build-screens/006-exercise-detail/006-05-split/002-split-InstructionsCard

# Split: InstructionsCard

Extract the `InstructionsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `_buildInstructionsCard`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/instructions_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `InstructionsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class InstructionsCard extends StatelessWidget {
  const InstructionsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```