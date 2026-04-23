# Task: 03-build-screens/009-settings/009-05-split/004-split-MuteNotificationsRow

# Split: MuteNotificationsRow

Extract the `MuteNotificationsRow` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/settings/settings_screen.dart` using grep string: `Mute Notifications`
2. **Create file** — Write `lib/screens/settings/widgets/mute_notifications_row.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MuteNotificationsRow()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MuteNotificationsRow extends StatelessWidget {
  const MuteNotificationsRow({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```