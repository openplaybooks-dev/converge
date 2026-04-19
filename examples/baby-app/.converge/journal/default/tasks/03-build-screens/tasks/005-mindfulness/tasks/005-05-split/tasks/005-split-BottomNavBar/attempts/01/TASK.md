# Task: 03-build-screens/005-mindfulness/005-05-split/005-split-BottomNavBar

# Split: BottomNavBar

Extract the `BottomNavBar` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mindfulness/mindfulness_screen.dart` using grep string: `_buildBottomNav`
2. **Create file** — Write `lib/screens/mindfulness/widgets/bottom_nav_bar.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BottomNavBar()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BottomNavBar extends StatelessWidget {
  const BottomNavBar({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```