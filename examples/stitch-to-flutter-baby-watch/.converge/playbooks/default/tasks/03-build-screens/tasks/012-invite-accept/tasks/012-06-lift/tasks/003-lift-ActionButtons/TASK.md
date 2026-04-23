---
id: 003-lift-ActionButtons
title: "Lift: ActionButtons"
description: Move ActionButtons from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/invite_accept/widgets/action_buttons.dart
outputs:
  - lib/widgets/action_buttons.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/action_buttons.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/action_buttons.dart
vars:
  widgetName: ActionButtons
  snakeName: action_buttons
  screenId: invite-accept
  screenTitle: null
  localWidgetPath: lib/screens/invite_accept/widgets/action_buttons.dart
  sharedWidgetPath: lib/widgets/action_buttons.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  subtaskId: 003-lift-ActionButtons
---

# Lift: ActionButtons

Move `ActionButtons` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/invite_accept/widgets/action_buttons.dart` → `lib/widgets/action_buttons.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/action_buttons.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
