---
id: 001-lift-GuardianCard
title: "Lift: GuardianCard"
description: Move GuardianCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/guardians/widgets/guardian_card.dart
outputs:
  - lib/widgets/guardian_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/guardian_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze --no-pub lib/widgets/guardian_card.dart
vars:
  widgetName: GuardianCard
  snakeName: guardian_card
  screenId: guardians
  screenTitle: null
  localWidgetPath: lib/screens/guardians/widgets/guardian_card.dart
  sharedWidgetPath: lib/widgets/guardian_card.dart
  localWidgetsDir: lib/screens/guardians/widgets
  screenPath: lib/screens/guardians/guardians_screen.dart
  subtaskId: 001-lift-GuardianCard
---

# Lift: GuardianCard

Move `GuardianCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/guardians/widgets/guardian_card.dart` → `lib/widgets/guardian_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/guardian_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
