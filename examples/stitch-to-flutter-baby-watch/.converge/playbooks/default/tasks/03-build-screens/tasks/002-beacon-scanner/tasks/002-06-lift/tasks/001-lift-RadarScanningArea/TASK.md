---
id: 001-lift-RadarScanningArea
title: "Lift: RadarScanningArea"
description: Move RadarScanningArea from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/beacon_scanner/widgets/radar_scanning_area.dart
outputs:
  - lib/widgets/radar_scanning_area.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/radar_scanning_area.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/radar_scanning_area.dart
vars:
  widgetName: RadarScanningArea
  snakeName: radar_scanning_area
  screenId: beacon-scanner
  screenTitle: null
  localWidgetPath: lib/screens/beacon_scanner/widgets/radar_scanning_area.dart
  sharedWidgetPath: lib/widgets/radar_scanning_area.dart
  localWidgetsDir: lib/screens/beacon_scanner/widgets
  screenPath: lib/screens/beacon_scanner/beacon_scanner_screen.dart
  subtaskId: 001-lift-RadarScanningArea
---

# Lift: RadarScanningArea

Move `RadarScanningArea` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/beacon_scanner/widgets/radar_scanning_area.dart` → `lib/widgets/radar_scanning_area.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/radar_scanning_area.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
