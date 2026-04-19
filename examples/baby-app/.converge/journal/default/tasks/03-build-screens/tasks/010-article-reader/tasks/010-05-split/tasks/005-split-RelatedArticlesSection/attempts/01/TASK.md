# Task: 03-build-screens/010-article-reader/010-05-split/005-split-RelatedArticlesSection

# Split: RelatedArticlesSection

Extract the `RelatedArticlesSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/article_reader/article_reader_screen.dart` using grep string: `_buildRelatedSection`
2. **Create file** — Write `lib/screens/article_reader/widgets/related_articles_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `RelatedArticlesSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class RelatedArticlesSection extends StatelessWidget {
  const RelatedArticlesSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```