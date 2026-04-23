---
id: 002-lift-SignalBars
title: "Lift: SignalBars"
description: Move SignalBars from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/beacon_scanner/widgets/signal_bars.dart
outputs:
  - lib/widgets/signal_bars.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/signal_bars.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/widgets/signal_bars.dart
vars:
  widgetName: SignalBars
  snakeName: signal_bars
  screenId: beacon-scanner
  screenTitle: null
  localWidgetPath: lib/screens/beacon_scanner/widgets/signal_bars.dart
  sharedWidgetPath: lib/widgets/signal_bars.dart
  localWidgetsDir: lib/screens/beacon_scanner/widgets
  screenPath: lib/screens/beacon_scanner/beacon_scanner_screen.dart
  subtaskId: 002-lift-SignalBars
---

# Lift: SignalBars

Move `SignalBars` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/beacon_scanner/widgets/signal_bars.dart` → `lib/widgets/signal_bars.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/signal_bars.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
