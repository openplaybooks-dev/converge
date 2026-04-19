---
id: 001-split-HeroHeader
title: "Split: HeroHeader"
description: Extract HeroHeader widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
outputs:
  - lib/screens/pregnancy_progress/widgets/hero_header.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/pregnancy_progress/widgets/hero_header.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/pregnancy_progress/widgets/hero_header.dart
vars:
  name: HeroHeader
  grep: _buildHeroHeader
  description: "Gradient header with trimester badge, week number, baby size text, and animated baby illustration"
  shared: false
  widgetName: HeroHeader
  grepString: _buildHeroHeader
  widgetPath: lib/screens/pregnancy_progress/widgets/hero_header.dart
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  screenId: pregnancy-progress
  screenTitle: null
  subtaskId: 001-split-HeroHeader
---

# Split: HeroHeader

Extract the `HeroHeader` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` using grep string: `_buildHeroHeader`
2. **Create file** — Write `lib/screens/pregnancy_progress/widgets/hero_header.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `HeroHeader()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class HeroHeader extends StatelessWidget {
  const HeroHeader({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
