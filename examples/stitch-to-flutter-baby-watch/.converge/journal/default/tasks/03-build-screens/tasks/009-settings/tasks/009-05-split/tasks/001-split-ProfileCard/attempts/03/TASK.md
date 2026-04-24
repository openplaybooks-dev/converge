# Task: 03-build-screens/009-settings/009-05-split/001-split-ProfileCard

# Split: ProfileCard

Extract the `ProfileCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `Elena Fisher`
2. **Create file** — Write `lib/screens/settings/widgets/profile_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ProfileCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ProfileCard extends StatelessWidget {
  const ProfileCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```