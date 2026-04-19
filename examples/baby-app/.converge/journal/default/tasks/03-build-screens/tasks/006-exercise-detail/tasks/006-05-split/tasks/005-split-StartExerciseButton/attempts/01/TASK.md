# Task: 03-build-screens/006-exercise-detail/006-05-split/005-split-StartExerciseButton

# Split: StartExerciseButton

Extract the `StartExerciseButton` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `Start Exercise`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/start_exercise_button.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `StartExerciseButton()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class StartExerciseButton extends StatelessWidget {
  const StartExerciseButton({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```