---
id: 001-lift-MajorMinorRow
title: "Lift: MajorMinorRow"
description: Move MajorMinorRow from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/widgets/major_minor_row.dart
outputs:
  - lib/widgets/major_minor_row.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/major_minor_row.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/major_minor_row.dart
vars:
  widgetName: MajorMinorRow
  snakeName: major_minor_row
  screenId: beacon-edit
  screenTitle: null
  localWidgetPath: lib/widgets/major_minor_row.dart
  sharedWidgetPath: lib/widgets/major_minor_row.dart
  localWidgetsDir: lib/screens/beacon_edit/widgets
  screenPath: lib/screens/beacon_edit/beacon_edit_screen.dart
  subtaskId: 001-lift-MajorMinorRow
---

# Lift: MajorMinorRow

Move `MajorMinorRow` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/widgets/major_minor_row.dart` → `lib/widgets/major_minor_row.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/major_minor_row.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
