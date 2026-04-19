# Task: 03-build-screens/003-weight-nutrition/003-05-split/001-split-WeightChartCard

# Split: WeightChartCard

Extract the `WeightChartCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `Weight Trend`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/weight_chart_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `WeightChartCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class WeightChartCard extends StatelessWidget {
  const WeightChartCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```