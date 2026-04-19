---
id: 003-split-ExerciseCard
title: "Split: ExerciseCard"
description: Extract ExerciseCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mindfulness/mindfulness_screen.dart
outputs:
  - lib/screens/mindfulness/widgets/exercise_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mindfulness/widgets/exercise_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mindfulness/widgets/exercise_card.dart
vars:
  name: ExerciseCard
  grep: _buildExerciseCard
  description: "Grid card for an individual exercise showing category icon, name, category label, and duration with staggered entrance animation"
  shared: true
  widgetName: ExerciseCard
  grepString: _buildExerciseCard
  widgetPath: lib/screens/mindfulness/widgets/exercise_card.dart
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  screenId: mindfulness
  screenTitle: null
  subtaskId: 003-split-ExerciseCard
---

# Split: ExerciseCard

Extract the `ExerciseCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mindfulness/mindfulness_screen.dart` using grep string: `_buildExerciseCard`
2. **Create file** — Write `lib/screens/mindfulness/widgets/exercise_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ExerciseCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ExerciseCard extends StatelessWidget {
  const ExerciseCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
