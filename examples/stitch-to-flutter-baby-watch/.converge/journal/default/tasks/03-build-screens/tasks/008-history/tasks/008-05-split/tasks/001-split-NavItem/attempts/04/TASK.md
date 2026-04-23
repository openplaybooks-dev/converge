# Task: 03-build-screens/008-history/008-05-split/001-split-NavItem

# Split: NavItem

Extract the `NavItem` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/history/history_screen.dart` using grep string: `class _NavItem extends StatelessWidget`
2. **Create file** — Write `lib/screens/history/widgets/nav_item.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `NavItem()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class NavItem extends StatelessWidget {
  const NavItem({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```