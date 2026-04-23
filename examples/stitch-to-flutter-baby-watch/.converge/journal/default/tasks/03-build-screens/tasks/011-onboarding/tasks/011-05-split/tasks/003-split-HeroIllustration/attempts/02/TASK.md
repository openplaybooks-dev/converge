# Task: 03-build-screens/011-onboarding/011-05-split/003-split-HeroIllustration

# Split: HeroIllustration

Extract the `HeroIllustration` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/onboarding/onboarding_screen.dart` using grep string: `Image.network('https://picsum.photos/seed/superkid/200/200'`
2. **Create file** — Write `lib/screens/onboarding/widgets/hero_illustration.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `HeroIllustration()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class HeroIllustration extends StatelessWidget {
  const HeroIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```