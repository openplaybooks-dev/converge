---
id: 003-split-EnergyLevelCard
title: "Split: EnergyLevelCard"
description: Extract EnergyLevelCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mood_wellness/mood_wellness_screen.dart
outputs:
  - lib/screens/mood_wellness/widgets/energy_level_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mood_wellness/widgets/energy_level_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mood_wellness/widgets/energy_level_card.dart
vars:
  name: EnergyLevelCard
  grep: _buildEnergyLevelCard
  description: Card with a segmented energy bar (1-5) and energy level label
  shared: false
  widgetName: EnergyLevelCard
  grepString: _buildEnergyLevelCard
  widgetPath: lib/screens/mood_wellness/widgets/energy_level_card.dart
  localWidgetsDir: lib/screens/mood_wellness/widgets
  screenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  screenId: mood-wellness
  screenTitle: null
  subtaskId: 003-split-EnergyLevelCard
---

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
