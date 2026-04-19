---
id: 002-split-FeaturedExerciseCard
title: "Split: FeaturedExerciseCard"
description: Extract FeaturedExerciseCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mindfulness/mindfulness_screen.dart
outputs:
  - lib/screens/mindfulness/widgets/featured_exercise_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mindfulness/widgets/featured_exercise_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mindfulness/widgets/featured_exercise_card.dart
vars:
  name: FeaturedExerciseCard
  grep: _buildFeaturedCard
  description: "Hero card showcasing a featured exercise with animated breathing icon, title, category badge, and duration"
  shared: false
  widgetName: FeaturedExerciseCard
  grepString: _buildFeaturedCard
  widgetPath: lib/screens/mindfulness/widgets/featured_exercise_card.dart
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  screenId: mindfulness
  screenTitle: null
  subtaskId: 002-split-FeaturedExerciseCard
---

# Split: FeaturedExerciseCard

Extract the `FeaturedExerciseCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mindfulness/mindfulness_screen.dart` using grep string: `_buildFeaturedCard`
2. **Create file** — Write `lib/screens/mindfulness/widgets/featured_exercise_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `FeaturedExerciseCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class FeaturedExerciseCard extends StatelessWidget {
  const FeaturedExerciseCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
