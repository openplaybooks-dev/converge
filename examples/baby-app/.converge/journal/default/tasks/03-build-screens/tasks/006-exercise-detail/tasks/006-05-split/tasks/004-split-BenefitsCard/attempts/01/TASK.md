# Task: 03-build-screens/006-exercise-detail/006-05-split/004-split-BenefitsCard

# Split: BenefitsCard

Extract the `BenefitsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `_buildBenefitsCard`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/benefits_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BenefitsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BenefitsCard extends StatelessWidget {
  const BenefitsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```