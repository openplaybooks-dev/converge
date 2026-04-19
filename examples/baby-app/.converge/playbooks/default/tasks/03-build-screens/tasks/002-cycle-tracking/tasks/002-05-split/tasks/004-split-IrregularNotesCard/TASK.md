---
id: 004-split-IrregularNotesCard
title: "Split: IrregularNotesCard"
description: Extract IrregularNotesCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/cycle_tracking/cycle_tracking_screen.dart
outputs:
  - lib/screens/cycle_tracking/widgets/irregular_notes_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/cycle_tracking/widgets/irregular_notes_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/cycle_tracking/widgets/irregular_notes_card.dart
vars:
  name: IrregularNotesCard
  grep: _buildIrregularNotesCard
  description: "Informational card about irregular cycles with count badge, explanation text, and latest user note"
  shared: false
  widgetName: IrregularNotesCard
  grepString: _buildIrregularNotesCard
  widgetPath: lib/screens/cycle_tracking/widgets/irregular_notes_card.dart
  localWidgetsDir: lib/screens/cycle_tracking/widgets
  screenPath: lib/screens/cycle_tracking/cycle_tracking_screen.dart
  screenId: cycle-tracking
  screenTitle: null
  subtaskId: 004-split-IrregularNotesCard
---

# Split: IrregularNotesCard

Extract the `IrregularNotesCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/cycle_tracking/cycle_tracking_screen.dart` using grep string: `_buildIrregularNotesCard`
2. **Create file** — Write `lib/screens/cycle_tracking/widgets/irregular_notes_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `IrregularNotesCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class IrregularNotesCard extends StatelessWidget {
  const IrregularNotesCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
