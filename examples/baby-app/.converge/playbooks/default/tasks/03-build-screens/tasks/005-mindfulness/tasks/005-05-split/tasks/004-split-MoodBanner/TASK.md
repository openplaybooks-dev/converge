---
id: 004-split-MoodBanner
title: "Split: MoodBanner"
description: Extract MoodBanner widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/mindfulness/mindfulness_screen.dart
outputs:
  - lib/screens/mindfulness/widgets/mood_banner.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/mindfulness/widgets/mood_banner.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/mindfulness/widgets/mood_banner.dart
vars:
  name: MoodBanner
  grep: _buildMoodBanner
  description: "Call-to-action banner prompting the user to log their mood with icon, text, and action button"
  shared: true
  widgetName: MoodBanner
  grepString: _buildMoodBanner
  widgetPath: lib/screens/mindfulness/widgets/mood_banner.dart
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  screenId: mindfulness
  screenTitle: null
  subtaskId: 004-split-MoodBanner
---

# Split: MoodBanner

Extract the `MoodBanner` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/mindfulness/mindfulness_screen.dart` using grep string: `_buildMoodBanner`
2. **Create file** — Write `lib/screens/mindfulness/widgets/mood_banner.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MoodBanner()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MoodBanner extends StatelessWidget {
  const MoodBanner({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
