---
id: 005-lift-StatusIndicator
title: "Lift: StatusIndicator"
description: Move StatusIndicator from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/invite_accept/widgets/status_indicator.dart
outputs:
  - lib/widgets/status_indicator.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/status_indicator.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/status_indicator.dart
vars:
  widgetName: StatusIndicator
  snakeName: status_indicator
  screenId: invite-accept
  screenTitle: null
  localWidgetPath: lib/screens/invite_accept/widgets/status_indicator.dart
  sharedWidgetPath: lib/widgets/status_indicator.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  subtaskId: 005-lift-StatusIndicator
---

# Lift: StatusIndicator

Move `StatusIndicator` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/invite_accept/widgets/status_indicator.dart` → `lib/widgets/status_indicator.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/status_indicator.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
