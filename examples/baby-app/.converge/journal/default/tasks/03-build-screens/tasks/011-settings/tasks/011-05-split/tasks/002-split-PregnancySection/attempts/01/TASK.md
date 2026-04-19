# Task: 03-build-screens/011-settings/011-05-split/002-split-PregnancySection

# Split: PregnancySection

Extract the `PregnancySection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildPregnancySection`
2. **Create file** — Write `lib/screens/settings/widgets/pregnancy_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PregnancySection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PregnancySection extends StatelessWidget {
  const PregnancySection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```