---
id: 001-split-ExerciseHeroCard
title: "Split: ExerciseHeroCard"
description: Extract ExerciseHeroCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/exercise_detail/exercise_detail_screen.dart
outputs:
  - lib/screens/exercise_detail/widgets/exercise_hero_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/exercise_detail/widgets/exercise_hero_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/exercise_detail/widgets/exercise_hero_card.dart
vars:
  name: ExerciseHeroCard
  grep: _buildHeroCard
  description: "Hero illustration card with breathing animation, exercise name, and category chip"
  shared: false
  widgetName: ExerciseHeroCard
  grepString: _buildHeroCard
  widgetPath: lib/screens/exercise_detail/widgets/exercise_hero_card.dart
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  screenId: exercise-detail
  screenTitle: null
  subtaskId: 001-split-ExerciseHeroCard
---

# Split: ExerciseHeroCard

Extract the `ExerciseHeroCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `_buildHeroCard`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/exercise_hero_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ExerciseHeroCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ExerciseHeroCard extends StatelessWidget {
  const ExerciseHeroCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
