# Task: 03-build-screens/009-education/009-05-split/002-split-FeaturedArticleCard

# Split: FeaturedArticleCard

Extract the `FeaturedArticleCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/education/education_screen.dart` using grep string: `_buildFeaturedCard`
2. **Create file** — Write `lib/screens/education/widgets/featured_article_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `FeaturedArticleCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class FeaturedArticleCard extends StatelessWidget {
  const FeaturedArticleCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```