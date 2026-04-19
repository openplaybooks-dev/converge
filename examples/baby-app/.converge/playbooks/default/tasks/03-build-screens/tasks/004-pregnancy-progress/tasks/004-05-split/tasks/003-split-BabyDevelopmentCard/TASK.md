---
id: 003-split-BabyDevelopmentCard
title: "Split: BabyDevelopmentCard"
description: Extract BabyDevelopmentCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
outputs:
  - lib/screens/pregnancy_progress/widgets/baby_development_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/pregnancy_progress/widgets/baby_development_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/pregnancy_progress/widgets/baby_development_card.dart
vars:
  name: BabyDevelopmentCard
  grep: _buildBabyDevelopmentCard
  description: Card showing baby development milestones with icon badges and descriptions
  shared: false
  widgetName: BabyDevelopmentCard
  grepString: _buildBabyDevelopmentCard
  widgetPath: lib/screens/pregnancy_progress/widgets/baby_development_card.dart
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  screenId: pregnancy-progress
  screenTitle: null
  subtaskId: 003-split-BabyDevelopmentCard
---

# Split: BabyDevelopmentCard

Extract the `BabyDevelopmentCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildBabyDevelopmentCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/baby_development_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BabyDevelopmentCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BabyDevelopmentCard extends StatelessWidget {
  const BabyDevelopmentCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
