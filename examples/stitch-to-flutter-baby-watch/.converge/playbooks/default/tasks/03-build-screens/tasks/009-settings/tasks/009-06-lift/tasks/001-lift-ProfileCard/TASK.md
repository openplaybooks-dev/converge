---
id: 001-lift-ProfileCard
title: "Lift: ProfileCard"
description: Move ProfileCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/settings/widgets/profile_card.dart
outputs:
  - lib/screens/settings/widgets/profile_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/screens/settings/widgets/profile_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/settings/widgets/profile_card.dart
vars:
  widgetName: ProfileCard
  snakeName: profile_card
  screenId: settings
  screenTitle: null
  localWidgetPath: lib/screens/settings/widgets/profile_card.dart
  sharedWidgetPath: lib/screens/settings/widgets/profile_card.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  subtaskId: 001-lift-ProfileCard
---

# Lift: ProfileCard

Move `ProfileCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/settings/widgets/profile_card.dart` → `lib/screens/settings/widgets/profile_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/profile_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
