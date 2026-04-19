---
id: 004-split-TipCalloutBlock
title: "Split: TipCalloutBlock"
description: Extract TipCalloutBlock widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/article_reader/article_reader_screen.dart
outputs:
  - lib/screens/article_reader/widgets/tip_callout_block.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/article_reader/widgets/tip_callout_block.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/article_reader/widgets/tip_callout_block.dart
vars:
  name: TipCalloutBlock
  grep: "Tip', style: textTheme.labelLarge"
  description: "Highlighted callout box with left lilac border, bold tip label, and body text for inline advice"
  shared: true
  widgetName: TipCalloutBlock
  grepString: "Tip', style: textTheme.labelLarge"
  widgetPath: lib/screens/article_reader/widgets/tip_callout_block.dart
  localWidgetsDir: lib/screens/article_reader/widgets
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  screenId: article-reader
  screenTitle: null
  subtaskId: 004-split-TipCalloutBlock
---

# Split: TipCalloutBlock

Extract the `TipCalloutBlock` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/article_reader/article_reader_screen.dart` using grep string: `Tip', style: textTheme.labelLarge`
2. **Create file** — Write `lib/screens/article_reader/widgets/tip_callout_block.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `TipCalloutBlock()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class TipCalloutBlock extends StatelessWidget {
  const TipCalloutBlock({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
