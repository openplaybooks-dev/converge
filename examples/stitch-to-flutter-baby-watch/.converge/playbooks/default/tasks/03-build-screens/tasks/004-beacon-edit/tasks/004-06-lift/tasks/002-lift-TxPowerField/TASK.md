---
id: 002-lift-TxPowerField
title: "Lift: TxPowerField"
description: Move TxPowerField from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/beacon_edit/widgets/tx_power_field.dart
outputs:
  - lib/widgets/tx_power_field.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/tx_power_field.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/tx_power_field.dart
vars:
  widgetName: TxPowerField
  snakeName: tx_power_field
  screenId: beacon-edit
  screenTitle: null
  localWidgetPath: lib/screens/beacon_edit/widgets/tx_power_field.dart
  sharedWidgetPath: lib/widgets/tx_power_field.dart
  localWidgetsDir: lib/screens/beacon_edit/widgets
  screenPath: lib/screens/beacon_edit/beacon_edit_screen.dart
  subtaskId: 002-lift-TxPowerField
---

# Lift: TxPowerField

Move `TxPowerField` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/beacon_edit/widgets/tx_power_field.dart` → `lib/widgets/tx_power_field.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/tx_power_field.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
