---
id: 001-split-CalendarCard
title: "Split: CalendarCard"
description: Extract CalendarCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/cycle_tracking/cycle_tracking_screen.dart
outputs:
  - lib/screens/cycle_tracking/widgets/calendar_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/cycle_tracking/widgets/calendar_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/cycle_tracking/widgets/calendar_card.dart
vars:
  name: CalendarCard
  grep: _buildCalendarCard
  description: "Monthly calendar view with period/fertile/ovulation day markers, month navigation, day-of-week headers, calendar grid, and color legend"
  shared: false
  widgetName: CalendarCard
  grepString: _buildCalendarCard
  widgetPath: lib/screens/cycle_tracking/widgets/calendar_card.dart
  localWidgetsDir: lib/screens/cycle_tracking/widgets
  screenPath: lib/screens/cycle_tracking/cycle_tracking_screen.dart
  screenId: cycle-tracking
  screenTitle: null
  subtaskId: 001-split-CalendarCard
---

# Split: CalendarCard

Extract the `CalendarCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/cycle_tracking/cycle_tracking_screen.dart` using grep string: `_buildCalendarCard`
2. **Create file** — Write `lib/screens/cycle_tracking/widgets/calendar_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `CalendarCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class CalendarCard extends StatelessWidget {
  const CalendarCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
