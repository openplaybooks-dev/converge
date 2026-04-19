---
id: 001-split-HeroImageCard
title: "Split: HeroImageCard"
description: Extract HeroImageCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/article_reader/article_reader_screen.dart
outputs:
  - lib/screens/article_reader/widgets/hero_image_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/article_reader/widgets/hero_image_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/article_reader/widgets/hero_image_card.dart
vars:
  name: HeroImageCard
  grep: _buildHeroCard
  description: "Full-width rounded card with 16:9 custom-painted nutrition illustration, fade-in and slide-up animation"
  shared: false
  widgetName: HeroImageCard
  grepString: _buildHeroCard
  widgetPath: lib/screens/article_reader/widgets/hero_image_card.dart
  localWidgetsDir: lib/screens/article_reader/widgets
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  screenId: article-reader
  screenTitle: null
  subtaskId: 001-split-HeroImageCard
---

# Split: HeroImageCard

Extract the `HeroImageCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/article_reader/article_reader_screen.dart` using grep string: `_buildHeroCard`
2. **Create file** — Write `lib/screens/article_reader/widgets/hero_image_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `HeroImageCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class HeroImageCard extends StatelessWidget {
  const HeroImageCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
