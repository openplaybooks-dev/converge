---
id: 004-split-RecommendationsCard
title: "Split: RecommendationsCard"
description: Extract RecommendationsCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mood_wellness/mood_wellness_screen.dart
outputs:
  - lib/screens/mood_wellness/widgets/recommendations_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mood_wellness/widgets/recommendations_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mood_wellness/widgets/recommendations_card.dart
vars:
  name: RecommendationsCard
  grep: _buildRecommendationsCard
  description: "Card listing wellness recommendations with icon, title, description, and chevron navigation"
  shared: false
  widgetName: RecommendationsCard
  grepString: _buildRecommendationsCard
  widgetPath: lib/screens/mood_wellness/widgets/recommendations_card.dart
  localWidgetsDir: lib/screens/mood_wellness/widgets
  screenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  screenId: mood-wellness
  screenTitle: null
  subtaskId: 004-split-RecommendationsCard
---

# Split: RecommendationsCard

Extract the `RecommendationsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mood_wellness/mood_wellness_screen.dart` using grep string: `_buildRecommendationsCard`
2. **Create file** — Write `lib/screens/mood_wellness/widgets/recommendations_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `RecommendationsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class RecommendationsCard extends StatelessWidget {
  const RecommendationsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
