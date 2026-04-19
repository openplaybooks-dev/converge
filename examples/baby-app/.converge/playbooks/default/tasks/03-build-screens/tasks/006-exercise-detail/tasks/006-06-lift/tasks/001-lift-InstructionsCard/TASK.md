---
id: 001-lift-InstructionsCard
title: "Lift: InstructionsCard"
description: Move InstructionsCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/exercise_detail/widgets/instructions_card.dart
outputs:
  - lib/widgets/instructions_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/instructions_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/instructions_card.dart
vars:
  widgetName: InstructionsCard
  snakeName: instructions_card
  screenId: exercise-detail
  screenTitle: null
  localWidgetPath: lib/screens/exercise_detail/widgets/instructions_card.dart
  sharedWidgetPath: lib/widgets/instructions_card.dart
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  subtaskId: 001-lift-InstructionsCard
---

# Lift: InstructionsCard

Move `InstructionsCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/exercise_detail/widgets/instructions_card.dart` → `lib/widgets/instructions_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/instructions_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
