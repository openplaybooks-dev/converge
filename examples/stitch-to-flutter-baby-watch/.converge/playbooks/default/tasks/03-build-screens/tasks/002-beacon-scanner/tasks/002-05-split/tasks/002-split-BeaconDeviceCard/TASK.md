---
id: 002-split-BeaconDeviceCard
title: "Split: BeaconDeviceCard"
description: Extract BeaconDeviceCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_scanner/beacon_scanner_screen.dart
outputs:
  - lib/screens/beacon_scanner/widgets/beacon_device_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_scanner/widgets/beacon_device_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/beacon_scanner/widgets/beacon_device_card.dart
vars:
  name: BeaconDeviceCard
  grep: _buildDeviceCard\(
  description: "Device card showing beacon name, sync status, signal strength and connect button"
  shared: false
  widgetName: BeaconDeviceCard
  grepString: _buildDeviceCard\(
  widgetPath: lib/screens/beacon_scanner/widgets/beacon_device_card.dart
  localWidgetsDir: lib/screens/beacon_scanner/widgets
  screenPath: lib/screens/beacon_scanner/beacon_scanner_screen.dart
  screenId: beacon-scanner
  screenTitle: null
  subtaskId: 002-split-BeaconDeviceCard
---

# Split: BeaconDeviceCard

Extract the `BeaconDeviceCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_scanner/beacon_scanner_screen.dart` using grep string: `_buildDeviceCard\(`
2. **Create file** — Write `lib/screens/beacon_scanner/widgets/beacon_device_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BeaconDeviceCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BeaconDeviceCard extends StatelessWidget {
  const BeaconDeviceCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
