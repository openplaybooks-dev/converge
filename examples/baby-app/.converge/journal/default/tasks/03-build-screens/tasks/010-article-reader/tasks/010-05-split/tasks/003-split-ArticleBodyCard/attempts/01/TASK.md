# Task: 03-build-screens/010-article-reader/010-05-split/003-split-ArticleBodyCard

# Split: ArticleBodyCard

Extract the `ArticleBodyCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/article_reader/article_reader_screen.dart` using grep string: `_buildBodyCard`
2. **Create file** — Write `lib/screens/article_reader/widgets/article_body_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ArticleBodyCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ArticleBodyCard extends StatelessWidget {
  const ArticleBodyCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```