# Task: 03-build-screens/006-exercise-detail/006-05-split/003-split-ExerciseChipsRow

# Split: ExerciseChipsRow

Extract the `ExerciseChipsRow` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `_buildChipsRow`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/exercise_chips_row.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ExerciseChipsRow()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ExerciseChipsRow extends StatelessWidget {
  const ExerciseChipsRow({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```