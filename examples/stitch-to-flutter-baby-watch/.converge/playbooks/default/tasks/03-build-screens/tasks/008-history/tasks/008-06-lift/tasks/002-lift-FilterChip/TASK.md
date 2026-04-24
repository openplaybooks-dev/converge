---
id: 002-lift-FilterChip
title: "Lift: FilterChip"
description: Move FilterChip from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/history/widgets/filter_chip.dart
outputs:
  - lib/widgets/filter_chip.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/filter_chip.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/filter_chip.dart
vars:
  widgetName: FilterChip
  snakeName: filter_chip
  screenId: history
  screenTitle: null
  localWidgetPath: lib/screens/history/widgets/filter_chip.dart
  sharedWidgetPath: lib/widgets/filter_chip.dart
  localWidgetsDir: lib/screens/history/widgets
  screenPath: lib/screens/history/history_screen.dart
  subtaskId: 002-lift-FilterChip
---

# Lift: FilterChip

Move `FilterChip` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/history/widgets/filter_chip.dart` → `lib/widgets/filter_chip.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/filter_chip.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
