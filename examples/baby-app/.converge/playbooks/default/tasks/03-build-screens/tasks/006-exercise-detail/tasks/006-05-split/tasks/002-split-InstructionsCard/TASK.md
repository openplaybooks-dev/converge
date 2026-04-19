---
id: 002-split-InstructionsCard
title: "Split: InstructionsCard"
description: Extract InstructionsCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/exercise_detail/exercise_detail_screen.dart
outputs:
  - lib/screens/exercise_detail/widgets/instructions_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/exercise_detail/widgets/instructions_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/exercise_detail/widgets/instructions_card.dart
vars:
  name: InstructionsCard
  grep: _buildInstructionsCard
  description: Numbered step-by-step instructions list in a card with dividers
  shared: true
  widgetName: InstructionsCard
  grepString: _buildInstructionsCard
  widgetPath: lib/screens/exercise_detail/widgets/instructions_card.dart
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  screenId: exercise-detail
  screenTitle: null
  subtaskId: 002-split-InstructionsCard
---

# Split: InstructionsCard

Extract the `InstructionsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `_buildInstructionsCard`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/instructions_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `InstructionsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class InstructionsCard extends StatelessWidget {
  const InstructionsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
