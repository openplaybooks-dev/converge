# Task: 03-build-screens/005-mindfulness/005-05-split/002-split-FeaturedExerciseCard

# Split: FeaturedExerciseCard

Extract the `FeaturedExerciseCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mindfulness/mindfulness_screen.dart` using grep string: `_buildFeaturedCard`
2. **Create file** — Write `lib/screens/mindfulness/widgets/featured_exercise_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `FeaturedExerciseCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class FeaturedExerciseCard extends StatelessWidget {
  const FeaturedExerciseCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```