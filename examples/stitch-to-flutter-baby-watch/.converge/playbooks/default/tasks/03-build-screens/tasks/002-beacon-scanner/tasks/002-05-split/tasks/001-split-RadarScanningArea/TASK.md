---
id: 001-split-RadarScanningArea
title: "Split: RadarScanningArea"
description: Extract RadarScanningArea widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_scanner/beacon_scanner_screen.dart
outputs:
  - lib/screens/beacon_scanner/widgets/radar_scanning_area.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_scanner/widgets/radar_scanning_area.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/beacon_scanner/widgets/radar_scanning_area.dart
vars:
  name: RadarScanningArea
  grep: "AnimatedBuilder\\(\\s*animation: _radarAnimation"
  description: Animated radar scanning circles with pulsing Bluetooth icon
  shared: true
  widgetName: RadarScanningArea
  grepString: "AnimatedBuilder\\(\\s*animation: _radarAnimation"
  widgetPath: lib/screens/beacon_scanner/widgets/radar_scanning_area.dart
  localWidgetsDir: lib/screens/beacon_scanner/widgets
  screenPath: lib/screens/beacon_scanner/beacon_scanner_screen.dart
  screenId: beacon-scanner
  screenTitle: null
  subtaskId: 001-split-RadarScanningArea
---

# Split: RadarScanningArea

Extract the `RadarScanningArea` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_scanner/beacon_scanner_screen.dart` using grep string: `AnimatedBuilder\(\s*animation: _radarAnimation`
2. **Create file** — Write `lib/screens/beacon_scanner/widgets/radar_scanning_area.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `RadarScanningArea()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class RadarScanningArea extends StatelessWidget {
  const RadarScanningArea({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
