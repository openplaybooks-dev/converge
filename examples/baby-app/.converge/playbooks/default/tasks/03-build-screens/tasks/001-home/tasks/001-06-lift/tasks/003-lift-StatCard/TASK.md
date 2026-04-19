---
id: 003-lift-StatCard
title: "Lift: StatCard"
description: Move StatCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/home/widgets/stat_card.dart
outputs:
  - lib/widgets/stat_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/stat_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/stat_card.dart
vars:
  widgetName: StatCard
  snakeName: stat_card
  screenId: home
  screenTitle: null
  localWidgetPath: lib/screens/home/widgets/stat_card.dart
  sharedWidgetPath: lib/widgets/stat_card.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  subtaskId: 003-lift-StatCard
---

# Lift: StatCard

Move `StatCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/home/widgets/stat_card.dart` → `lib/widgets/stat_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/stat_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
