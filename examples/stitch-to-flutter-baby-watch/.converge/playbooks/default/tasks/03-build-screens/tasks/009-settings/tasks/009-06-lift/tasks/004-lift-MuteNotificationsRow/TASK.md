---
id: 004-lift-MuteNotificationsRow
title: "Lift: MuteNotificationsRow"
description: Move MuteNotificationsRow from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - 
outputs:
  - lib/widgets/mute_notifications_row.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/mute_notifications_row.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/
vars:
  widgetName: MuteNotificationsRow
  snakeName: mute_notifications_row
  screenId: settings
  screenTitle: null
  localWidgetPath: 
  sharedWidgetPath: lib/widgets/mute_notifications_row.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  subtaskId: 004-lift-MuteNotificationsRow
---

# Lift: MuteNotificationsRow

Move `MuteNotificationsRow` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `` → `lib/widgets/mute_notifications_row.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/mute_notifications_row.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
