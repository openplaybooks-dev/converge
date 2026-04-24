---
id: 001-lift-StatusSection
title: "Lift: StatusSection"
description: Move StatusSection from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/home/widgets/status_section.dart
outputs:
  - lib/widgets/status_section.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/status_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/status_section.dart
vars:
  widgetName: StatusSection
  snakeName: status_section
  screenId: home
  screenTitle: null
  localWidgetPath: lib/screens/home/widgets/status_section.dart
  sharedWidgetPath: lib/widgets/status_section.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  subtaskId: 001-lift-StatusSection
---

# Lift: StatusSection

Move `StatusSection` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/home/widgets/status_section.dart` → `lib/widgets/status_section.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/status_section.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
