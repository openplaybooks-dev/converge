---
id: 002-split-AlertSettingsCard
title: "Split: AlertSettingsCard"
description: Extract AlertSettingsCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/alert_settings_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/alert_settings_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/settings/widgets/alert_settings_card.dart
vars:
  name: AlertSettingsCard
  grep: TIMEOUT INTERVAL
  description: Alert timeout interval buttons and audio/vibration toggles
  shared: false
  widgetName: AlertSettingsCard
  grepString: TIMEOUT INTERVAL
  widgetPath: lib/screens/settings/widgets/alert_settings_card.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 002-split-AlertSettingsCard
---

# Split: AlertSettingsCard

Extract the `AlertSettingsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `TIMEOUT INTERVAL`
2. **Create file** — Write `lib/screens/settings/widgets/alert_settings_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `AlertSettingsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class AlertSettingsCard extends StatelessWidget {
  const AlertSettingsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
