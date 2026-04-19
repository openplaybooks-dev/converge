---
id: 002-split-MoodTrendsCard
title: "Split: MoodTrendsCard"
description: Extract MoodTrendsCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mood_wellness/mood_wellness_screen.dart
outputs:
  - lib/screens/mood_wellness/widgets/mood_trends_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mood_wellness/widgets/mood_trends_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mood_wellness/widgets/mood_trends_card.dart
vars:
  name: MoodTrendsCard
  grep: _buildMoodTrendsCard
  description: Card with a custom-painted line chart showing mood trends over the past 14 days
  shared: false
  widgetName: MoodTrendsCard
  grepString: _buildMoodTrendsCard
  widgetPath: lib/screens/mood_wellness/widgets/mood_trends_card.dart
  localWidgetsDir: lib/screens/mood_wellness/widgets
  screenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  screenId: mood-wellness
  screenTitle: null
  subtaskId: 002-split-MoodTrendsCard
---

# Split: MoodTrendsCard

Extract the `MoodTrendsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mood_wellness/mood_wellness_screen.dart` using grep string: `_buildMoodTrendsCard`
2. **Create file** — Write `lib/screens/mood_wellness/widgets/mood_trends_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MoodTrendsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MoodTrendsCard extends StatelessWidget {
  const MoodTrendsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
