---
id: 002-lift-PageIndicator
title: "Lift: PageIndicator"
description: Move PageIndicator from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/onboarding/widgets/page_indicator.dart
outputs:
  - lib/widgets/page_indicator.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/page_indicator.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/page_indicator.dart
vars:
  widgetName: PageIndicator
  snakeName: page_indicator
  screenId: onboarding
  screenTitle: null
  localWidgetPath: lib/screens/onboarding/widgets/page_indicator.dart
  sharedWidgetPath: lib/widgets/page_indicator.dart
  localWidgetsDir: lib/screens/onboarding/widgets
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  subtaskId: 002-lift-PageIndicator
---

# Lift: PageIndicator

Move `PageIndicator` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/onboarding/widgets/page_indicator.dart` → `lib/widgets/page_indicator.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/page_indicator.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
