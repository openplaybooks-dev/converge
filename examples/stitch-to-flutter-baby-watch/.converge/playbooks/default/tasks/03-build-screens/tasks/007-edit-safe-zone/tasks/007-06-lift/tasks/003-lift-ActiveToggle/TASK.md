---
id: 003-lift-ActiveToggle
title: "Lift: ActiveToggle"
description: Move ActiveToggle from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/edit_safe_zone/widgets/active_toggle.dart
outputs:
  - lib/widgets/active_toggle.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/active_toggle.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/active_toggle.dart
vars:
  widgetName: ActiveToggle
  snakeName: active_toggle
  screenId: edit-safe-zone
  screenTitle: null
  localWidgetPath: lib/screens/edit_safe_zone/widgets/active_toggle.dart
  sharedWidgetPath: lib/widgets/active_toggle.dart
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  subtaskId: 003-lift-ActiveToggle
---

# Lift: ActiveToggle

Move `ActiveToggle` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/edit_safe_zone/widgets/active_toggle.dart` → `lib/widgets/active_toggle.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/active_toggle.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
