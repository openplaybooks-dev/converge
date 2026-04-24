# Task: 03-build-screens/012-invite-accept/012-05-split/003-split-ActionButtons

# Split: ActionButtons

Extract the `ActionButtons` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `// Action Buttons`
2. **Create file** — Write `lib/screens/invite_accept/widgets/action_buttons.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ActionButtons()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ActionButtons extends StatelessWidget {
  const ActionButtons({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```