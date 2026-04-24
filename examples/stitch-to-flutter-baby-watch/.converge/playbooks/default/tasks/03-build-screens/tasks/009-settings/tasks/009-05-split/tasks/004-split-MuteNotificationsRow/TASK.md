---
id: 004-split-MuteNotificationsRow
title: "Split: MuteNotificationsRow"
description: Extract MuteNotificationsRow widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/widgets/mute_notifications_row.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/widgets/mute_notifications_row.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart format --set-exit-if-changed lib/widgets/mute_notifications_row.dart; test $? -lt 2
vars:
  name: MuteNotificationsRow
  grep: Mute Notifications
  description: Horizontal scroll row of mute duration buttons
  shared: false
  widgetName: MuteNotificationsRow
  grepString: Mute Notifications
  widgetPath: lib/widgets/mute_notifications_row.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 004-split-MuteNotificationsRow
---

# Split: MuteNotificationsRow

Extract the `MuteNotificationsRow` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `Mute Notifications`
2. **Create file** — Write `lib/screens/settings/widgets/mute_notifications_row.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MuteNotificationsRow()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MuteNotificationsRow extends StatelessWidget {
  const MuteNotificationsRow({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
