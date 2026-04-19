# Task: 03-build-screens/008-mood-wellness/008-05-split/005-split-MoodHistoryEntry

# Split: MoodHistoryEntry

Extract the `MoodHistoryEntry` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mood_wellness/mood_wellness_screen.dart` using grep string: `_buildHistoryEntry`
2. **Create file** — Write `lib/screens/mood_wellness/widgets/mood_history_entry.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MoodHistoryEntry()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MoodHistoryEntry extends StatelessWidget {
  const MoodHistoryEntry({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```