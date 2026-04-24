---
id: 001-lift-PermissionCard
title: "Lift: PermissionCard"
description: Move PermissionCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/onboarding/widgets/permission_card.dart
outputs:
  - lib/widgets/permission_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/permission_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/permission_card.dart
vars:
  widgetName: PermissionCard
  snakeName: permission_card
  screenId: onboarding
  screenTitle: null
  localWidgetPath: lib/screens/onboarding/widgets/permission_card.dart
  sharedWidgetPath: lib/widgets/permission_card.dart
  localWidgetsDir: lib/screens/onboarding/widgets
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  subtaskId: 001-lift-PermissionCard
---

# Lift: PermissionCard

Move `PermissionCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/onboarding/widgets/permission_card.dart` → `lib/widgets/permission_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/permission_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
