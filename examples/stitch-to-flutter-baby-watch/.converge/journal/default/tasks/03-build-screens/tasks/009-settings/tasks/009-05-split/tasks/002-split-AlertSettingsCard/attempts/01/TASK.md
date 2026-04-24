# Task: 03-build-screens/009-settings/009-05-split/002-split-AlertSettingsCard

# Split: AlertSettingsCard

Extract the `AlertSettingsCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `TIMEOUT INTERVAL`
2. **Create file** — Write `lib/screens/settings/widgets/alert_settings_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `AlertSettingsCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class AlertSettingsCard extends StatelessWidget {
  const AlertSettingsCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```