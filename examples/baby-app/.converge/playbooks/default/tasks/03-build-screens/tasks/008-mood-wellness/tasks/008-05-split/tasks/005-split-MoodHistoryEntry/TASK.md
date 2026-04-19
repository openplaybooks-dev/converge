---
id: 005-split-MoodHistoryEntry
title: "Split: MoodHistoryEntry"
description: Extract MoodHistoryEntry widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mood_wellness/mood_wellness_screen.dart
outputs:
  - lib/screens/mood_wellness/widgets/mood_history_entry.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mood_wellness/widgets/mood_history_entry.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mood_wellness/widgets/mood_history_entry.dart
vars:
  name: MoodHistoryEntry
  grep: _buildHistoryEntry
  description: "Card showing a past mood log entry with color-coded dot, mood label, energy level, date, and optional notes"
  shared: true
  widgetName: MoodHistoryEntry
  grepString: _buildHistoryEntry
  widgetPath: lib/screens/mood_wellness/widgets/mood_history_entry.dart
  localWidgetsDir: lib/screens/mood_wellness/widgets
  screenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  screenId: mood-wellness
  screenTitle: null
  subtaskId: 005-split-MoodHistoryEntry
---

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
