---
id: 003-split-ExerciseChipsRow
title: "Split: ExerciseChipsRow"
description: Extract ExerciseChipsRow widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/exercise_detail/exercise_detail_screen.dart
outputs:
  - lib/screens/exercise_detail/widgets/exercise_chips_row.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/exercise_detail/widgets/exercise_chips_row.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/exercise_detail/widgets/exercise_chips_row.dart
vars:
  name: ExerciseChipsRow
  grep: _buildChipsRow
  description: Row of duration and difficulty info chips with icons
  shared: true
  widgetName: ExerciseChipsRow
  grepString: _buildChipsRow
  widgetPath: lib/screens/exercise_detail/widgets/exercise_chips_row.dart
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  screenId: exercise-detail
  screenTitle: null
  subtaskId: 003-split-ExerciseChipsRow
---

# Split: ExerciseChipsRow

Extract the `ExerciseChipsRow` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `_buildChipsRow`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/exercise_chips_row.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ExerciseChipsRow()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ExerciseChipsRow extends StatelessWidget {
  const ExerciseChipsRow({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
