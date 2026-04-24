---
id: 003-split-BeaconStrip
title: "Split: BeaconStrip"
description: Extract BeaconStrip widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/widgets/beacon_strip.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/widgets/beacon_strip.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/home/widgets/beacon_strip.dart
vars:
  name: BeaconStrip
  grep: _buildBeaconStrip()
  description: "Beacon info strip showing child name, distance and battery"
  shared: false
  widgetName: BeaconStrip
  grepString: _buildBeaconStrip()
  widgetPath: lib/screens/home/widgets/beacon_strip.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 003-split-BeaconStrip
---

# Split: BeaconStrip

Extract the `BeaconStrip` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `_buildBeaconStrip()`
2. **Create file** — Write `lib/screens/home/widgets/beacon_strip.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BeaconStrip()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BeaconStrip extends StatelessWidget {
  const BeaconStrip({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
