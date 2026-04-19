---
id: 006-split-DueDateCard
title: "Split: DueDateCard"
description: Extract DueDateCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
outputs:
  - lib/screens/pregnancy_progress/widgets/due_date_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/pregnancy_progress/widgets/due_date_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/pregnancy_progress/widgets/due_date_card.dart
vars:
  name: DueDateCard
  grep: _buildDueDateCard
  description: "Countdown card showing days remaining, progress bar, estimated due date, and week progress"
  shared: false
  widgetName: DueDateCard
  grepString: _buildDueDateCard
  widgetPath: lib/screens/pregnancy_progress/widgets/due_date_card.dart
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  screenId: pregnancy-progress
  screenTitle: null
  subtaskId: 006-split-DueDateCard
---

# Split: DueDateCard

Extract the `DueDateCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildDueDateCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/due_date_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `DueDateCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class DueDateCard extends StatelessWidget {
  const DueDateCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
