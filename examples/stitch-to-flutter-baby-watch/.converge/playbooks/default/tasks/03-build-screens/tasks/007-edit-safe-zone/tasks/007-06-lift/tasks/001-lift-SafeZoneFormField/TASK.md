---
id: 001-lift-SafeZoneFormField
title: "Lift: SafeZoneFormField"
description: Move SafeZoneFormField from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart
outputs:
  - lib/widgets/safe_zone_form_field.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/safe_zone_form_field.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/safe_zone_form_field.dart
vars:
  widgetName: SafeZoneFormField
  snakeName: safe_zone_form_field
  screenId: edit-safe-zone
  screenTitle: null
  localWidgetPath: lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart
  sharedWidgetPath: lib/widgets/safe_zone_form_field.dart
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  subtaskId: 001-lift-SafeZoneFormField
---

# Lift: SafeZoneFormField

Move `SafeZoneFormField` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/edit_safe_zone/widgets/safe_zone_form_field.dart` → `lib/widgets/safe_zone_form_field.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/safe_zone_form_field.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
