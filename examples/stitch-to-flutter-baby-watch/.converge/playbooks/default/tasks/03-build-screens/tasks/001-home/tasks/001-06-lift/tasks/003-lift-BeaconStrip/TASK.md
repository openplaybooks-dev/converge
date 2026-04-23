---
id: 003-lift-BeaconStrip
title: "Lift: BeaconStrip"
description: Move BeaconStrip from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/home/widgets/beacon_strip.dart
outputs:
  - lib/widgets/beacon_strip.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/beacon_strip.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/beacon_strip.dart
vars:
  widgetName: BeaconStrip
  snakeName: beacon_strip
  screenId: home
  screenTitle: null
  localWidgetPath: lib/screens/home/widgets/beacon_strip.dart
  sharedWidgetPath: lib/widgets/beacon_strip.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  subtaskId: 003-lift-BeaconStrip
---

# Lift: BeaconStrip

Move `BeaconStrip` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/home/widgets/beacon_strip.dart` → `lib/widgets/beacon_strip.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/beacon_strip.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
