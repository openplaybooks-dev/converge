# Task: 03-build-screens/011-settings/011-05-split/003-split-NotificationsSection

# Split: NotificationsSection

Extract the `NotificationsSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `_buildNotificationsSection`
2. **Create file** — Write `lib/screens/settings/widgets/notifications_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `NotificationsSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class NotificationsSection extends StatelessWidget {
  const NotificationsSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```