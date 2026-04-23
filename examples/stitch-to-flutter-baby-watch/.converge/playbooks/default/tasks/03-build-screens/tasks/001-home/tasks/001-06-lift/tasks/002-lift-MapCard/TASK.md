---
id: 002-lift-MapCard
title: "Lift: MapCard"
description: Move MapCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/home/widgets/map_card.dart
outputs:
  - lib/widgets/map_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/map_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/map_card.dart
vars:
  widgetName: MapCard
  snakeName: map_card
  screenId: home
  screenTitle: null
  localWidgetPath: lib/screens/home/widgets/map_card.dart
  sharedWidgetPath: lib/widgets/map_card.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  subtaskId: 002-lift-MapCard
---

# Lift: MapCard

Move `MapCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/home/widgets/map_card.dart` → `lib/widgets/map_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/map_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
