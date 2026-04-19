---
id: 001-lift-ExerciseCard
title: "Lift: ExerciseCard"
description: Move ExerciseCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/mindfulness/widgets/exercise_card.dart
outputs:
  - lib/widgets/exercise_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/exercise_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/exercise_card.dart
vars:
  widgetName: ExerciseCard
  snakeName: exercise_card
  screenId: mindfulness
  screenTitle: null
  localWidgetPath: lib/screens/mindfulness/widgets/exercise_card.dart
  sharedWidgetPath: lib/widgets/exercise_card.dart
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  subtaskId: 001-lift-ExerciseCard
---

# Lift: ExerciseCard

Move `ExerciseCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/mindfulness/widgets/exercise_card.dart` → `lib/widgets/exercise_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/exercise_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
