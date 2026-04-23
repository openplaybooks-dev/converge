---
id: 003-lift-BeaconSetupCard
title: "Lift: BeaconSetupCard"
description: Move BeaconSetupCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
outputs:
  - lib/widgets/beacon_setup_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/beacon_setup_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/beacon_setup_card.dart
vars:
  widgetName: BeaconSetupCard
  snakeName: beacon_setup_card
  screenId: settings
  screenTitle: null
  localWidgetPath: lib/screens/settings/widgets/beacon_setup_card.dart
  sharedWidgetPath: lib/widgets/beacon_setup_card.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  subtaskId: 003-lift-BeaconSetupCard
---

# Lift: BeaconSetupCard

Move `BeaconSetupCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/settings/widgets/beacon_setup_card.dart` → `lib/widgets/beacon_setup_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/beacon_setup_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
