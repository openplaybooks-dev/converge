---
id: 002-lift-ModeSelectorPill
title: "Lift: ModeSelectorPill"
description: Move ModeSelectorPill from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/home/widgets/mode_selector_pill.dart
outputs:
  - lib/widgets/mode_selector_pill.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/mode_selector_pill.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/mode_selector_pill.dart
vars:
  widgetName: ModeSelectorPill
  snakeName: mode_selector_pill
  screenId: home
  screenTitle: null
  localWidgetPath: lib/screens/home/widgets/mode_selector_pill.dart
  sharedWidgetPath: lib/widgets/mode_selector_pill.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  subtaskId: 002-lift-ModeSelectorPill
---

# Lift: ModeSelectorPill

Move `ModeSelectorPill` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/home/widgets/mode_selector_pill.dart` → `lib/widgets/mode_selector_pill.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/mode_selector_pill.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
