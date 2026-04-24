# Task: 03-build-screens/006-add-safe-zone/006-05-split/004-split-RadiusSelector

# Split: RadiusSelector

Extract the `RadiusSelector` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/add_safe_zone/add_safe_zone_screen.dart` using grep string: `_radii: ['25m', '50m', '100m', '200m']`
2. **Create file** — Write `lib/screens/add_safe_zone/widgets/radius_selector.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `RadiusSelector()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class RadiusSelector extends StatelessWidget {
  const RadiusSelector({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```