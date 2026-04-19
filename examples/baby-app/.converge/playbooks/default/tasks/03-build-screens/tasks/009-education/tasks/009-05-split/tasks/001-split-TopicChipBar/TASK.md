---
id: 001-split-TopicChipBar
title: "Split: TopicChipBar"
description: Extract TopicChipBar widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/education/education_screen.dart
outputs:
  - lib/screens/education/widgets/topic_chip_bar.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/education/widgets/topic_chip_bar.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/education/widgets/topic_chip_bar.dart
vars:
  name: TopicChipBar
  grep: _buildTopicChips
  description: Horizontal scrollable list of topic filter chips with selection state
  shared: true
  widgetName: TopicChipBar
  grepString: _buildTopicChips
  widgetPath: lib/screens/education/widgets/topic_chip_bar.dart
  localWidgetsDir: lib/screens/education/widgets
  screenPath: lib/screens/education/education_screen.dart
  screenId: education
  screenTitle: null
  subtaskId: 001-split-TopicChipBar
---

# Split: TopicChipBar

Extract the `TopicChipBar` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/education/education_screen.dart` using grep string: `_buildTopicChips`
2. **Create file** — Write `lib/screens/education/widgets/topic_chip_bar.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `TopicChipBar()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class TopicChipBar extends StatelessWidget {
  const TopicChipBar({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
