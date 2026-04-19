---
id: 002-split-CurrentCycleCard
title: "Split: CurrentCycleCard"
description: Extract CurrentCycleCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/cycle_tracking/cycle_tracking_screen.dart
outputs:
  - lib/screens/cycle_tracking/widgets/current_cycle_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/cycle_tracking/widgets/current_cycle_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/cycle_tracking/widgets/current_cycle_card.dart
vars:
  name: CurrentCycleCard
  grep: _buildCurrentCycleCard
  description: "Summary card showing current cycle day, cycle length, next predicted period date, and estimated ovulation date"
  shared: false
  widgetName: CurrentCycleCard
  grepString: _buildCurrentCycleCard
  widgetPath: lib/screens/cycle_tracking/widgets/current_cycle_card.dart
  localWidgetsDir: lib/screens/cycle_tracking/widgets
  screenPath: lib/screens/cycle_tracking/cycle_tracking_screen.dart
  screenId: cycle-tracking
  screenTitle: null
  subtaskId: 002-split-CurrentCycleCard
---

# Split: CurrentCycleCard

Extract the `CurrentCycleCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/cycle_tracking/cycle_tracking_screen.dart` using grep string: `_buildCurrentCycleCard`
2. **Create file** — Write `lib/screens/cycle_tracking/widgets/current_cycle_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `CurrentCycleCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class CurrentCycleCard extends StatelessWidget {
  const CurrentCycleCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
