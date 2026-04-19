# Task: 03-build-screens/002-cycle-tracking/002-05-split/001-split-CalendarCard

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