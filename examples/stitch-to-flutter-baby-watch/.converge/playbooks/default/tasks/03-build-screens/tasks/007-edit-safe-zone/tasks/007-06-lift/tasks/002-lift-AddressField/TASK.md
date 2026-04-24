---
id: 002-lift-AddressField
title: "Lift: AddressField"
description: Move AddressField from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/edit_safe_zone/widgets/address_field.dart
outputs:
  - lib/widgets/address_field.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/address_field.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/address_field.dart
vars:
  widgetName: AddressField
  snakeName: address_field
  screenId: edit-safe-zone
  screenTitle: null
  localWidgetPath: lib/screens/edit_safe_zone/widgets/address_field.dart
  sharedWidgetPath: lib/widgets/address_field.dart
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  subtaskId: 002-lift-AddressField
---

# Lift: AddressField

Move `AddressField` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/edit_safe_zone/widgets/address_field.dart` → `lib/widgets/address_field.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/address_field.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
