---
id: 003-lift-BottomNavBar
title: "Lift: BottomNavBar"
description: Move BottomNavBar from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/mindfulness/widgets/bottom_nav_bar.dart
outputs:
  - lib/widgets/bottom_nav_bar.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/bottom_nav_bar.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/bottom_nav_bar.dart
vars:
  widgetName: BottomNavBar
  snakeName: bottom_nav_bar
  screenId: mindfulness
  screenTitle: null
  localWidgetPath: lib/screens/mindfulness/widgets/bottom_nav_bar.dart
  sharedWidgetPath: lib/widgets/bottom_nav_bar.dart
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  subtaskId: 003-lift-BottomNavBar
---

# Lift: BottomNavBar

Move `BottomNavBar` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/mindfulness/widgets/bottom_nav_bar.dart` → `lib/widgets/bottom_nav_bar.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/bottom_nav_bar.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
