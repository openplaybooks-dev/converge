---
id: 003-split-HeroIllustrationCard
title: "Split: HeroIllustrationCard"
description: Extract HeroIllustrationCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/_widgets/hero_illustration_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/_widgets/hero_illustration_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/home/_widgets/hero_illustration_card.dart
vars:
  name: HeroIllustrationCard
  grep: _buildHeroCard
  description: "Full-width card with fetal development illustration, week number, and baby size comparison text with breathing animation"
  shared: false
  widgetName: HeroIllustrationCard
  grepString: _buildHeroCard
  widgetPath: lib/screens/home/_widgets/hero_illustration_card.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 003-split-HeroIllustrationCard
---

# Split: HeroIllustrationCard

Extract the `HeroIllustrationCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `_buildHeroCard`
2. **Create file** — Write `lib/screens/home/_widgets/hero_illustration_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `HeroIllustrationCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class HeroIllustrationCard extends StatelessWidget {
  const HeroIllustrationCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
