# Task: 03-build-screens/009-settings/009-05-split/005-split-GeneralSettingsSection

# Split: GeneralSettingsSection

Extract the `GeneralSettingsSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `System Permissions`
2. **Create file** — Write `lib/screens/settings/widgets/general_settings_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `GeneralSettingsSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class GeneralSettingsSection extends StatelessWidget {
  const GeneralSettingsSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```