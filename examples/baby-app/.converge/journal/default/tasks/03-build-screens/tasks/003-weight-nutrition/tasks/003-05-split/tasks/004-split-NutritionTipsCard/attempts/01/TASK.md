# Task: 03-build-screens/003-weight-nutrition/003-05-split/004-split-NutritionTipsCard

# Split: NutritionTipsCard

Extract the `NutritionTipsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `Nutrition Tips`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/nutrition_tips_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `NutritionTipsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class NutritionTipsCard extends StatelessWidget {
  const NutritionTipsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```