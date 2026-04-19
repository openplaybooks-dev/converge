# Task: 03-build-screens/008-mood-wellness/008-05-split/002-split-MoodTrendsCard

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