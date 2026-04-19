---
id: 001-lift-GreetingHeader
title: "Lift: GreetingHeader"
description: Move GreetingHeader from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/home/widgets/greeting_header.dart
outputs:
  - lib/widgets/greeting_header.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/greeting_header.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/greeting_header.dart
vars:
  widgetName: GreetingHeader
  snakeName: greeting_header
  screenId: home
  screenTitle: null
  localWidgetPath: lib/screens/home/widgets/greeting_header.dart
  sharedWidgetPath: lib/widgets/greeting_header.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  subtaskId: 001-lift-GreetingHeader
---

# Lift: GreetingHeader

Move `GreetingHeader` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/home/widgets/greeting_header.dart` → `lib/widgets/greeting_header.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/greeting_header.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
