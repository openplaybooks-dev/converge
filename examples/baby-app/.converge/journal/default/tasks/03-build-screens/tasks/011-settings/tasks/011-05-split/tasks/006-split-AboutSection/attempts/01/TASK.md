# Task: 03-build-screens/011-settings/011-05-split/006-split-AboutSection

# Split: AboutSection

Extract the `AboutSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildAboutSection`
2. **Create file** — Write `lib/screens/settings/widgets/about_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `AboutSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class AboutSection extends StatelessWidget {
  const AboutSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```