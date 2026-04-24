---
id: 001-lift-BottomNav
title: "Lift: BottomNav"
description: Move BottomNav from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/safe_zones/widgets/bottom_nav.dart
outputs:
  - lib/widgets/bottom_nav.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/bottom_nav.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/bottom_nav.dart
vars:
  widgetName: BottomNav
  snakeName: bottom_nav
  screenId: safe-zones
  screenTitle: null
  localWidgetPath: lib/screens/safe_zones/widgets/bottom_nav.dart
  sharedWidgetPath: lib/widgets/bottom_nav.dart
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  subtaskId: 001-lift-BottomNav
---

# Lift: BottomNav

Move `BottomNav` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/safe_zones/widgets/bottom_nav.dart` → `lib/widgets/bottom_nav.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/bottom_nav.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
