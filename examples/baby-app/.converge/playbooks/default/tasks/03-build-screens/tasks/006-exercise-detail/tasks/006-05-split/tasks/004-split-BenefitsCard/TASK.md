---
id: 004-split-BenefitsCard
title: "Split: BenefitsCard"
description: Extract BenefitsCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/exercise_detail/exercise_detail_screen.dart
outputs:
  - lib/screens/exercise_detail/widgets/benefits_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/exercise_detail/widgets/benefits_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/exercise_detail/widgets/benefits_card.dart
vars:
  name: BenefitsCard
  grep: _buildBenefitsCard
  description: Benefits list card with check-circle icons for each benefit item
  shared: true
  widgetName: BenefitsCard
  grepString: _buildBenefitsCard
  widgetPath: lib/screens/exercise_detail/widgets/benefits_card.dart
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  screenId: exercise-detail
  screenTitle: null
  subtaskId: 004-split-BenefitsCard
---

# Split: BenefitsCard

Extract the `BenefitsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/exercise_detail/exercise_detail_screen.dart` using grep string: `_buildBenefitsCard`
2. **Create file** — Write `lib/screens/exercise_detail/widgets/benefits_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BenefitsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BenefitsCard extends StatelessWidget {
  const BenefitsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
