---
id: 002-split-PregnancySection
title: "Split: PregnancySection"
description: Extract PregnancySection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/settings/settings_screen.dart
outputs:
  - lib/screens/settings/widgets/pregnancy_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/settings/widgets/pregnancy_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/settings/widgets/pregnancy_section.dart
vars:
  name: PregnancySection
  grep: _buildPregnancySection
  description: Due date row with chevron and current trimester badge in a card
  shared: false
  widgetName: PregnancySection
  grepString: _buildPregnancySection
  widgetPath: lib/screens/settings/widgets/pregnancy_section.dart
  localWidgetsDir: lib/screens/settings/widgets
  screenPath: lib/screens/settings/settings_screen.dart
  screenId: settings
  screenTitle: null
  subtaskId: 002-split-PregnancySection
---

# Split: PregnancySection

Extract the `PregnancySection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildPregnancySection`
2. **Create file** — Write `lib/screens/settings/widgets/pregnancy_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PregnancySection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PregnancySection extends StatelessWidget {
  const PregnancySection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
