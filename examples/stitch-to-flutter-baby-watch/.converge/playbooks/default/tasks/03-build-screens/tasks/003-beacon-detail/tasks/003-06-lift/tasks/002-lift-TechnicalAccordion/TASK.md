---
id: 002-lift-TechnicalAccordion
title: "Lift: TechnicalAccordion"
description: Move TechnicalAccordion from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/beacon_detail/widgets/technical_accordion.dart
outputs:
  - lib/widgets/technical_accordion.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/technical_accordion.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/technical_accordion.dart
vars:
  widgetName: TechnicalAccordion
  snakeName: technical_accordion
  screenId: beacon-detail
  screenTitle: null
  localWidgetPath: lib/screens/beacon_detail/widgets/technical_accordion.dart
  sharedWidgetPath: lib/widgets/technical_accordion.dart
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  subtaskId: 002-lift-TechnicalAccordion
---

# Lift: TechnicalAccordion

Move `TechnicalAccordion` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/beacon_detail/widgets/technical_accordion.dart` → `lib/widgets/technical_accordion.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/technical_accordion.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
