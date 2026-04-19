---
id: 002-lift-ExerciseChipsRow
title: "Lift: ExerciseChipsRow"
description: Move ExerciseChipsRow from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/exercise_detail/widgets/exercise_chips_row.dart
outputs:
  - lib/widgets/exercise_chips_row.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/exercise_chips_row.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/exercise_chips_row.dart
vars:
  widgetName: ExerciseChipsRow
  snakeName: exercise_chips_row
  screenId: exercise-detail
  screenTitle: null
  localWidgetPath: lib/screens/exercise_detail/widgets/exercise_chips_row.dart
  sharedWidgetPath: lib/widgets/exercise_chips_row.dart
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  subtaskId: 002-lift-ExerciseChipsRow
---

# Lift: ExerciseChipsRow

Move `ExerciseChipsRow` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/exercise_detail/widgets/exercise_chips_row.dart` → `lib/widgets/exercise_chips_row.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/exercise_chips_row.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
