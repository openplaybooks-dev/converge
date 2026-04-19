# Task: 03-build-screens/005-mindfulness/005-05-split/001-split-CategoryChips

# Split: CategoryChips

Extract the `CategoryChips` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mindfulness/mindfulness_screen.dart` using grep string: `_buildCategoryChips`
2. **Create file** — Write `lib/screens/mindfulness/widgets/category_chips.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `CategoryChips()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class CategoryChips extends StatelessWidget {
  const CategoryChips({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```