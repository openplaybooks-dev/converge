# Task: 03-build-screens/004-pregnancy-progress/004-05-split/001-split-HeroHeader

# Split: HeroHeader

Extract the `HeroHeader` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildHeroHeader`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/hero_header.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `HeroHeader()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class HeroHeader extends StatelessWidget {
  const HeroHeader({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```