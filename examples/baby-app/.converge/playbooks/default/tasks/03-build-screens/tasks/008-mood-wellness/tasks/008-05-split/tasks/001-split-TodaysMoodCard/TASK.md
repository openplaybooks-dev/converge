---
id: 001-split-TodaysMoodCard
title: "Split: TodaysMoodCard"
description: Extract TodaysMoodCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mood_wellness/mood_wellness_screen.dart
outputs:
  - lib/screens/mood_wellness/widgets/todays_mood_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mood_wellness/widgets/todays_mood_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mood_wellness/widgets/todays_mood_card.dart
vars:
  name: TodaysMoodCard
  grep: _buildTodaysMoodCard
  description: "Card displaying today's mood with a 1-5 level selector, mood label, note text, and logged-at timestamp"
  shared: false
  widgetName: TodaysMoodCard
  grepString: _buildTodaysMoodCard
  widgetPath: lib/screens/mood_wellness/widgets/todays_mood_card.dart
  localWidgetsDir: lib/screens/mood_wellness/widgets
  screenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  screenId: mood-wellness
  screenTitle: null
  subtaskId: 001-split-TodaysMoodCard
---

# Split: TodaysMoodCard

Extract the `TodaysMoodCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mood_wellness/mood_wellness_screen.dart` using grep string: `_buildTodaysMoodCard`
2. **Create file** — Write `lib/screens/mood_wellness/widgets/todays_mood_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `TodaysMoodCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class TodaysMoodCard extends StatelessWidget {
  const TodaysMoodCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
