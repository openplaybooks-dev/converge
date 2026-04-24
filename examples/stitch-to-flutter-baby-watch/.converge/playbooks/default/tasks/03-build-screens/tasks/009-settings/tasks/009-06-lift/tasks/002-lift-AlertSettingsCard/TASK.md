---
id: 002-lift-AlertSettingsCard
title: "Lift: AlertSettingsCard"
description: Move AlertSettingsCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/settings/widgets/alert_settings_card.dart
outputs:
  - lib/widgets/alert_settings_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/alert_settings_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/alert_settings_card.dart
vars:
  widgetName: AlertSettingsCard
  snakeName: alert_settings_card
  screenId: settings
  screenTitle: null
  localWidgetPath: lib/screens/settings/widgets/alert_settings_card.dart
  sharedWidgetPath: lib/widgets/alert_settings_card.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  subtaskId: 002-lift-AlertSettingsCard
---

# Lift: AlertSettingsCard

Move `AlertSettingsCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/settings/widgets/alert_settings_card.dart` → `lib/widgets/alert_settings_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/alert_settings_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
