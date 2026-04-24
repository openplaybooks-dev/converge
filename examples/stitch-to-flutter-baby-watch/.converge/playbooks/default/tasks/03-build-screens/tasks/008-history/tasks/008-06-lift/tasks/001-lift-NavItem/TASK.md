---
id: 001-lift-NavItem
title: "Lift: NavItem"
description: Move NavItem from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/history/widgets/nav_item.dart
outputs:
  - lib/widgets/nav_item.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/nav_item.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/nav_item.dart
vars:
  widgetName: NavItem
  snakeName: nav_item
  screenId: history
  screenTitle: null
  localWidgetPath: lib/screens/history/widgets/nav_item.dart
  sharedWidgetPath: lib/widgets/nav_item.dart
  localWidgetsDir: lib/screens/history/widgets
  screenPath: lib/screens/history/history_screen.dart
  subtaskId: 001-lift-NavItem
---

# Lift: NavItem

Move `NavItem` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/history/widgets/nav_item.dart` → `lib/widgets/nav_item.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/nav_item.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
