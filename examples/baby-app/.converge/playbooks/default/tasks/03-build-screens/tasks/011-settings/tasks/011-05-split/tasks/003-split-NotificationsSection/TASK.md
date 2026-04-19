---
id: 003-split-NotificationsSection
title: "Split: NotificationsSection"
description: Extract NotificationsSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/notifications_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/notifications_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/settings/widgets/notifications_section.dart
vars:
  name: NotificationsSection
  grep: _buildNotificationsSection
  description: "Card with toggle rows for daily reminders, checkup alerts, and self-care nudges"
  shared: false
  widgetName: NotificationsSection
  grepString: _buildNotificationsSection
  widgetPath: lib/screens/settings/widgets/notifications_section.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 003-split-NotificationsSection
---

# Split: NotificationsSection

Extract the `NotificationsSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildNotificationsSection`
2. **Create file** — Write `lib/screens/settings/widgets/notifications_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `NotificationsSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class NotificationsSection extends StatelessWidget {
  const NotificationsSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
