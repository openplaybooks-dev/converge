# Task: 03-build-screens/003-weight-nutrition/003-05-split/005-split-WeightHistorySection

# Split: WeightHistorySection

Extract the `WeightHistorySection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/weight_nutrition/weight_nutrition_screen.dart` using grep string: `Recent Entries`
2. **Create file** — Write `lib/screens/weight_nutrition/widgets/weight_history_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `WeightHistorySection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class WeightHistorySection extends StatelessWidget {
  const WeightHistorySection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```