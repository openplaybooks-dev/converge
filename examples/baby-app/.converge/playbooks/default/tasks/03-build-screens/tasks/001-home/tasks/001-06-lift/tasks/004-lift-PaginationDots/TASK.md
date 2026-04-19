---
id: 004-lift-PaginationDots
title: "Lift: PaginationDots"
description: Move PaginationDots from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/home/widgets/pagination_dots.dart
outputs:
  - lib/widgets/pagination_dots.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/pagination_dots.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/pagination_dots.dart
vars:
  widgetName: PaginationDots
  snakeName: pagination_dots
  screenId: home
  screenTitle: null
  localWidgetPath: lib/screens/home/widgets/pagination_dots.dart
  sharedWidgetPath: lib/widgets/pagination_dots.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  subtaskId: 004-lift-PaginationDots
---

# Lift: PaginationDots

Move `PaginationDots` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/home/widgets/pagination_dots.dart` → `lib/widgets/pagination_dots.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/pagination_dots.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
