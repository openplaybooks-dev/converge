---
id: 003-split-SignalBars
title: "Split: SignalBars"
description: Extract SignalBars widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_scanner/beacon_scanner_screen.dart
outputs:
  - lib/screens/beacon_scanner/widgets/signal_bars.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_scanner/widgets/signal_bars.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/beacon_scanner/widgets/signal_bars.dart
vars:
  name: SignalBars
  grep: _buildSignalBars
  description: 4-bar signal strength indicator widget
  shared: true
  widgetName: SignalBars
  grepString: _buildSignalBars
  widgetPath: lib/screens/beacon_scanner/widgets/signal_bars.dart
  localWidgetsDir: lib/screens/beacon_scanner/widgets
  screenPath: lib/screens/beacon_scanner/beacon_scanner_screen.dart
  screenId: beacon-scanner
  screenTitle: null
  subtaskId: 003-split-SignalBars
---

# Split: SignalBars

Extract the `SignalBars` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_scanner/beacon_scanner_screen.dart` using grep string: `_buildSignalBars`
2. **Create file** — Write `lib/screens/beacon_scanner/widgets/signal_bars.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `SignalBars()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class SignalBars extends StatelessWidget {
  const SignalBars({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
