# Task: 03-build-screens/011-onboarding/011-05-split/002-split-PageIndicator

# Split: PageIndicator

Extract the `PageIndicator` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/onboarding/onboarding_screen.dart` using grep string: `_PageIndicator(isActive: true`
2. **Create file** — Write `lib/screens/onboarding/widgets/page_indicator.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PageIndicator()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PageIndicator extends StatelessWidget {
  const PageIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```