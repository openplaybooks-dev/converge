---
id: 001-split-GuardianCard
title: "Split: GuardianCard"
description: Extract GuardianCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/guardians/guardians_screen.dart
outputs:
  - lib/screens/guardians/widgets/guardian_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/guardians/widgets/guardian_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/guardians/widgets/guardian_card.dart
vars:
  name: GuardianCard
  grep: class _GuardianCard extends StatelessWidget
  description: "Card displaying guardian info with avatar, name, role badge, and online status"
  shared: true
  widgetName: GuardianCard
  grepString: class _GuardianCard extends StatelessWidget
  widgetPath: lib/screens/guardians/widgets/guardian_card.dart
  localWidgetsDir: lib/screens/guardians/widgets
  screenPath: lib/screens/guardians/guardians_screen.dart
  screenId: guardians
  screenTitle: null
  subtaskId: 001-split-GuardianCard
---

# Split: GuardianCard

Extract the `GuardianCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/guardians/guardians_screen.dart` using grep string: `class _GuardianCard extends StatelessWidget`
2. **Create file** — Write `lib/screens/guardians/widgets/guardian_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `GuardianCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class GuardianCard extends StatelessWidget {
  const GuardianCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
