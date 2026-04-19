---
id: 001-lift-SelfCareCard
title: "Lift: SelfCareCard"
description: Move SelfCareCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/pregnancy_progress/widgets/self_care_card.dart
outputs:
  - lib/widgets/self_care_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/self_care_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/self_care_card.dart
vars:
  widgetName: SelfCareCard
  snakeName: self_care_card
  screenId: pregnancy-progress
  screenTitle: null
  localWidgetPath: lib/screens/pregnancy_progress/widgets/self_care_card.dart
  sharedWidgetPath: lib/widgets/self_care_card.dart
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  subtaskId: 001-lift-SelfCareCard
---

# Lift: SelfCareCard

Move `SelfCareCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/pregnancy_progress/widgets/self_care_card.dart` → `lib/widgets/self_care_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/self_care_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
