# Task: 03-build-screens/009-education/009-05-split/003-split-ArticleCard

# Split: ArticleCard

Extract the `ArticleCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/education/education_screen.dart` using grep string: `_buildArticleCard`
2. **Create file** — Write `lib/screens/education/widgets/article_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ArticleCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ArticleCard extends StatelessWidget {
  const ArticleCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```