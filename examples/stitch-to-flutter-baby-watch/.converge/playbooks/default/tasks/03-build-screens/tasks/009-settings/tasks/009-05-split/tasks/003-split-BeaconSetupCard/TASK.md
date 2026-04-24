---
id: 003-split-BeaconSetupCard
title: "Split: BeaconSetupCard"
description: Extract BeaconSetupCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/beacon_setup_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/beacon_setup_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/settings/widgets/beacon_setup_card.dart
vars:
  name: BeaconSetupCard
  grep: RSSI THRESHOLD
  description: Beacon RSSI threshold slider and scan interval setting
  shared: false
  widgetName: BeaconSetupCard
  grepString: RSSI THRESHOLD
  widgetPath: lib/screens/settings/widgets/beacon_setup_card.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 003-split-BeaconSetupCard
---

# Split: BeaconSetupCard

Extract the `BeaconSetupCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `RSSI THRESHOLD`
2. **Create file** — Write `lib/screens/settings/widgets/beacon_setup_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BeaconSetupCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BeaconSetupCard extends StatelessWidget {
  const BeaconSetupCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
