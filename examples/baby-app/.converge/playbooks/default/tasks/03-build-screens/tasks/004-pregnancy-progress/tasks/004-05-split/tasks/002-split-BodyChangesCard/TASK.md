---
id: 002-split-BodyChangesCard
title: "Split: BodyChangesCard"
description: Extract BodyChangesCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
outputs:
  - lib/screens/pregnancy_progress/widgets/body_changes_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/pregnancy_progress/widgets/body_changes_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/pregnancy_progress/widgets/body_changes_card.dart
vars:
  name: BodyChangesCard
  grep: _buildBodyChangesCard
  description: Card listing body changes for the current week with coral bullet points and dividers
  shared: false
  widgetName: BodyChangesCard
  grepString: _buildBodyChangesCard
  widgetPath: lib/screens/pregnancy_progress/widgets/body_changes_card.dart
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  screenId: pregnancy-progress
  screenTitle: null
  subtaskId: 002-split-BodyChangesCard
---

# Split: BodyChangesCard

Extract the `BodyChangesCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildBodyChangesCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/body_changes_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BodyChangesCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BodyChangesCard extends StatelessWidget {
  const BodyChangesCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
