# Task: 03-build-screens/004-pregnancy-progress/004-05-split/005-split-ExerciseGuideCard

# Split: ExerciseGuideCard

Extract the `ExerciseGuideCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildExerciseGuideCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ExerciseGuideCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ExerciseGuideCard extends StatelessWidget {
  const ExerciseGuideCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```