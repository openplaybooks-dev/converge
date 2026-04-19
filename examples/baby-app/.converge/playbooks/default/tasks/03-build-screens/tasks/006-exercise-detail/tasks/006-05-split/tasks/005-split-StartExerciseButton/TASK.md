---
id: 005-split-StartExerciseButton
title: "Split: StartExerciseButton"
description: Extract StartExerciseButton widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/exercise_detail/exercise_detail_screen.dart
outputs:
  - lib/screens/exercise_detail/widgets/start_exercise_button.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/exercise_detail/widgets/start_exercise_button.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/exercise_detail/widgets/start_exercise_button.dart
vars:
  name: StartExerciseButton
  grep: Start Exercise
  description: Full-width elevated CTA button in bottom navigation bar with fade-in animation
  shared: false
  widgetName: StartExerciseButton
  grepString: Start Exercise
  widgetPath: lib/screens/exercise_detail/widgets/start_exercise_button.dart
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  screenId: exercise-detail
  screenTitle: null
  subtaskId: 005-split-StartExerciseButton
---

# Split: StartExerciseButton

Extract the `StartExerciseButton` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `Start Exercise`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/start_exercise_button.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `StartExerciseButton()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class StartExerciseButton extends StatelessWidget {
  const StartExerciseButton({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
