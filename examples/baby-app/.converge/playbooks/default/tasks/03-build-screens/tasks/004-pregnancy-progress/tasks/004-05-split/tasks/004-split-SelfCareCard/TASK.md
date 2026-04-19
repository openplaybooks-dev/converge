---
id: 004-split-SelfCareCard
title: "Split: SelfCareCard"
description: Extract SelfCareCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
outputs:
  - lib/screens/pregnancy_progress/widgets/self_care_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/pregnancy_progress/widgets/self_care_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/pregnancy_progress/widgets/self_care_card.dart
vars:
  name: SelfCareCard
  grep: _buildSelfCareCard
  description: Checklist card with completion tracking showing self-care tasks with check/uncheck states
  shared: true
  widgetName: SelfCareCard
  grepString: _buildSelfCareCard
  widgetPath: lib/screens/pregnancy_progress/widgets/self_care_card.dart
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  screenId: pregnancy-progress
  screenTitle: null
  subtaskId: 004-split-SelfCareCard
---

# Split: SelfCareCard

Extract the `SelfCareCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildSelfCareCard`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/self_care_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `SelfCareCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class SelfCareCard extends StatelessWidget {
  const SelfCareCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
