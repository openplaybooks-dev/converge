# Task: 03-build-screens/006-exercise-detail/006-05-split/001-split-ExerciseHeroCard

# Split: ExerciseHeroCard

Extract the `ExerciseHeroCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `_buildHeroCard`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/exercise_hero_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ExerciseHeroCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ExerciseHeroCard extends StatelessWidget {
  const ExerciseHeroCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```