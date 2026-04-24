---
id: 005-lift-GeneralSettingsSection
title: "Lift: GeneralSettingsSection"
description: Move GeneralSettingsSection from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/settings/widgets/general_settings_section.dart
outputs:
  - lib/widgets/general_settings_section.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/general_settings_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/general_settings_section.dart
vars:
  widgetName: GeneralSettingsSection
  snakeName: general_settings_section
  screenId: settings
  screenTitle: null
  localWidgetPath: lib/screens/settings/widgets/general_settings_section.dart
  sharedWidgetPath: lib/widgets/general_settings_section.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  subtaskId: 005-lift-GeneralSettingsSection
---

# Lift: GeneralSettingsSection

Move `GeneralSettingsSection` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/settings/widgets/general_settings_section.dart` → `lib/widgets/general_settings_section.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/general_settings_section.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
