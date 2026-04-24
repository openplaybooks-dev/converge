---
id: 004-lift-QuickActions
title: "Lift: QuickActions"
description: Move QuickActions from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/home/widgets/quick_actions.dart
outputs:
  - lib/widgets/quick_actions.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/quick_actions.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze --no-pub lib/widgets/quick_actions.dart
vars:
  widgetName: QuickActions
  snakeName: quick_actions
  screenId: home
  screenTitle: null
  localWidgetPath: lib/screens/home/widgets/quick_actions.dart
  sharedWidgetPath: lib/widgets/quick_actions.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  subtaskId: 004-lift-QuickActions
---

# Lift: QuickActions

Move `QuickActions` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/home/widgets/quick_actions.dart` → `lib/widgets/quick_actions.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/quick_actions.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
