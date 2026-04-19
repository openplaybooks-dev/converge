# Task: 03-build-screens/010-article-reader/010-05-split/004-split-TipCalloutBlock

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