---
id: 003-split-CycleHistoryCard
title: "Split: CycleHistoryCard"
description: Extract CycleHistoryCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/cycle_tracking/cycle_tracking_screen.dart
outputs:
  - lib/screens/cycle_tracking/widgets/cycle_history_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/cycle_tracking/widgets/cycle_history_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/cycle_tracking/widgets/cycle_history_card.dart
vars:
  name: CycleHistoryCard
  grep: _buildHistoryCard
  description: "List of past cycle entries with date ranges, durations, and irregular cycle badges"
  shared: false
  widgetName: CycleHistoryCard
  grepString: _buildHistoryCard
  widgetPath: lib/screens/cycle_tracking/widgets/cycle_history_card.dart
  localWidgetsDir: lib/screens/cycle_tracking/widgets
  screenPath: lib/screens/cycle_tracking/cycle_tracking_screen.dart
  screenId: cycle-tracking
  screenTitle: null
  subtaskId: 003-split-CycleHistoryCard
---

# Split: CycleHistoryCard

Extract the `CycleHistoryCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/cycle_tracking/cycle_tracking_screen.dart` using grep string: `_buildHistoryCard`
2. **Create file** — Write `lib/screens/cycle_tracking/widgets/cycle_history_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `CycleHistoryCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class CycleHistoryCard extends StatelessWidget {
  const CycleHistoryCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
