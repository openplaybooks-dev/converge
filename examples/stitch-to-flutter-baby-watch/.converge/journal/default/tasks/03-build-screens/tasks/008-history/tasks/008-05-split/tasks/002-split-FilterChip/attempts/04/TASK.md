# Task: 03-build-screens/008-history/008-05-split/002-split-FilterChip

# Split: FilterChip

Extract the `FilterChip` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/history/history_screen.dart` using grep string: `class _FilterChip extends StatelessWidget`
2. **Create file** — Write `lib/screens/history/widgets/filter_chip.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `FilterChip()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class FilterChip extends StatelessWidget {
  const FilterChip({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```