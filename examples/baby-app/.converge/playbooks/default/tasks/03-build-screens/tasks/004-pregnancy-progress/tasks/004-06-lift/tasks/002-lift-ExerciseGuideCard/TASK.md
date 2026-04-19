---
id: 002-lift-ExerciseGuideCard
title: "Lift: ExerciseGuideCard"
description: Move ExerciseGuideCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart
outputs:
  - lib/widgets/exercise_guide_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/exercise_guide_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/exercise_guide_card.dart
vars:
  widgetName: ExerciseGuideCard
  snakeName: exercise_guide_card
  screenId: pregnancy-progress
  screenTitle: null
  localWidgetPath: lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart
  sharedWidgetPath: lib/widgets/exercise_guide_card.dart
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  subtaskId: 002-lift-ExerciseGuideCard
---

# Lift: ExerciseGuideCard

Move `ExerciseGuideCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/pregnancy_progress/widgets/exercise_guide_card.dart` → `lib/widgets/exercise_guide_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/exercise_guide_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
