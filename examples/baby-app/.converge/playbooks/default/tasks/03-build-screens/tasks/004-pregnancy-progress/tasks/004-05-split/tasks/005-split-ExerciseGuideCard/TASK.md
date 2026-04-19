---
id: 005-split-ExerciseGuideCard
title: "Split: ExerciseGuideCard"
description: Extract ExerciseGuideCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
outputs:
  - lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart
vars:
  name: ExerciseGuideCard
  grep: _buildExerciseGuideCard
  description: "Card listing safe exercises with icon, name, description, and navigation chevron"
  shared: true
  widgetName: ExerciseGuideCard
  grepString: _buildExerciseGuideCard
  widgetPath: lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  screenId: pregnancy-progress
  screenTitle: null
  subtaskId: 005-split-ExerciseGuideCard
---

# Split: ExerciseGuideCard

Extract the `ExerciseGuideCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildExerciseGuideCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ExerciseGuideCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ExerciseGuideCard extends StatelessWidget {
  const ExerciseGuideCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
