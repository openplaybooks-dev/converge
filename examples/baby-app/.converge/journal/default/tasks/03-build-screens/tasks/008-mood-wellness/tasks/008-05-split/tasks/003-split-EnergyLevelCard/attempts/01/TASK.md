# Task: 03-build-screens/008-mood-wellness/008-05-split/003-split-EnergyLevelCard

# Split: EnergyLevelCard

Extract the `EnergyLevelCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mood_wellness/mood_wellness_screen.dart` using grep string: `_buildEnergyLevelCard`
2. **Create file** — Write `lib/screens/mood_wellness/widgets/energy_level_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `EnergyLevelCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class EnergyLevelCard extends StatelessWidget {
  const EnergyLevelCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```