# Task: 03-build-screens/003-weight-nutrition/003-05-split/002-split-BmiGaugeCard

# Split: BmiGaugeCard

Extract the `BmiGaugeCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `BMI gauge showing 22.4`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/bmi_gauge_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BmiGaugeCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BmiGaugeCard extends StatelessWidget {
  const BmiGaugeCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```