# Task: 03-build-screens/007-edit-safe-zone/007-05-split/001-split-MapPreviewCard

# Split: MapPreviewCard

Extract the `MapPreviewCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/edit_safe_zone/edit_safe_zone_screen.dart` using grep string: `MapPreviewCard`
2. **Create file** — Write `lib/screens/edit_safe_zone/widgets/map_preview_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MapPreviewCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MapPreviewCard extends StatelessWidget {
  const MapPreviewCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```